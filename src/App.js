import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import axios from 'axios';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [inputData, setInputData] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [language, setLanguage] = useState('c');
  const [isLoading, setIsLoading] = useState(false);
  const [executionTime, setExecutionTime] = useState(0);
  const [supportedLanguages, setSupportedLanguages] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentJobId, setCurrentJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState('idle'); // idle, pending, running, completed, failed, queued
  const [queuePosition, setQueuePosition] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false); // 초기화 완료 플래그
  const [showTestCases, setShowTestCases] = useState(false); // 테스트 케이스 패널 표시 여부
  const [showInputTerminal, setShowInputTerminal] = useState(true); // 입력/터미널 패널 표시 여부
  const [editorHeight, setEditorHeight] = useState('50vh'); // 에디터 높이 (기본값)
  const [isResizing, setIsResizing] = useState(false); // 리사이즈 중인지 여부
  const [editorInstance, setEditorInstance] = useState(null); // Monaco Editor 인스턴스
  const [showInputWarning, setShowInputWarning] = useState(false); // 입력 데이터 경고창 표시 여부
  const [isMobile, setIsMobile] = useState(false); // 모바일 여부
  const [showBaekjoonModal, setShowBaekjoonModal] = useState(false); // 백준 모달 표시 여부
  const [baekjoonInput, setBaekjoonInput] = useState(''); // 백준 입력값
  const [isImportingBaekjoon, setIsImportingBaekjoon] = useState(false); // 백준 가져오기 진행 중 여부
  const [fontSize, setFontSize] = useState(14); // 폰트 크기 상태
  
  // AI 힌트 관련 상태
  const [aiHint, setAiHint] = useState(null); // AI 힌트 데이터
  const [isLoadingAIHint, setIsLoadingAIHint] = useState(false); // AI 힌트 로딩 상태
  const [showAIHintModal, setShowAIHintModal] = useState(false); // AI 힌트 모달 표시 여부
  const [aiHintCache, setAiHintCache] = useState(new Map()); // AI 힌트 캐시
  
  // 테스트 케이스 관리
  const [testCases, setTestCases] = useState([
    { id: 1, name: '테스트 (1)', input: '', expected: '', isEnabled: true }
  ]);
  const [selectedTestCase, setSelectedTestCase] = useState(1);
  const [testResults, setTestResults] = useState([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // 기본 코드 템플릿
  const codeTemplates = useMemo(() => ({
    c: `// C 코드를 여기에 작성하세요
#include <stdio.h>

int main() {
    printf("Hello, Zerone!\\n");
    return 0;
}`,
    cpp: `// C++ 코드를 여기에 작성하세요
#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "Hello, Zerone!" << endl;
    return 0;
}`,
    python: `# Python 코드를 여기에 작성하세요
print("Hello, Zerone!")`,
    java: `// Java 코드를 여기에 작성하세요
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Zerone!");
    }
}`,
    javascript: `// JavaScript 코드를 여기에 작성하세요
console.log("Hello, Zerone!");`
  }), []);

  // 언어별 Monaco Editor 설정
  const languageConfigs = {
    python: 'python',
    cpp: 'cpp',
    c: 'c',
    java: 'java',
    javascript: 'javascript'
  };

  // 모바일 감지 함수
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
  }, []);

  // localStorage에서 저장된 데이터 복구
  const loadSavedData = useCallback(() => {
    try {
      const savedLanguage = localStorage.getItem('vscode_runner_language');
      const savedInputData = localStorage.getItem('vscode_runner_input_data');
      const savedSidebarCollapsed = localStorage.getItem('vscode_runner_sidebar_collapsed');
      const savedTestCases = localStorage.getItem('vscode_runner_test_cases');
      const savedFontSize = localStorage.getItem('vscode_runner_font_size');
      
      // 언어 설정 (저장된 언어가 있으면 사용, 없으면 기본값 C)
      const currentLang = savedLanguage && codeTemplates[savedLanguage] ? savedLanguage : 'c';
      setLanguage(currentLang);
      const savedCode = localStorage.getItem(`vscode_runner_code_${currentLang}`);
      
      if (savedCode && savedCode.trim() !== '') {
        setCode(savedCode);
      } else {
        setCode(codeTemplates[currentLang]);
      }
      
      if (savedInputData) {
        setInputData(savedInputData);
      }
      
      if (savedSidebarCollapsed === 'true') {
        setSidebarCollapsed(true);
      }
      
      // 폰트 크기 복구
      if (savedFontSize) {
        setFontSize(parseInt(savedFontSize));
      }

      // 테스트 케이스 복구
      if (savedTestCases) {
        try {
          const parsedTestCases = JSON.parse(savedTestCases);
          setTestCases(parsedTestCases);
        } catch (e) {
          console.error('테스트 케이스 복구 중 오류:', e);
        }
      }
      
      setIsInitialized(true);
    } catch (error) {
      console.error('저장된 데이터 복구 중 오류:', error);
      setIsInitialized(true);
    }
  }, [codeTemplates]);

  // 데이터 저장 함수
  const saveData = (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('데이터 저장 중 오류:', error);
    }
  };

  // 코드 변경 시 저장 (언어별로 분리)
  useEffect(() => {
    if (isInitialized && code) {
      saveData(`vscode_runner_code_${language}`, code);
    }
  }, [code, language, isInitialized]);

  // 입력 데이터 변경 시 저장
  useEffect(() => {
    if (isInitialized) {
      saveData('vscode_runner_input_data', inputData);
    }
  }, [inputData, isInitialized]);

  // 언어 변경 시 저장 및 코드 전환
  useEffect(() => {
    if (isInitialized) {
      // 마지막 사용 언어를 localStorage에 저장
      saveData('vscode_runner_language', language);
      
      // 언어 변경 시 해당 언어의 저장된 코드 또는 기본 템플릿 로드
      const savedCode = localStorage.getItem(`vscode_runner_code_${language}`);
      if (savedCode && savedCode.trim() !== '') {
        setCode(savedCode);
      } else {
        setCode(codeTemplates[language]);
      }
      
      // 언어 변경 시 토큰 업데이트
      if (editorInstance) {
        setTimeout(async () => {
          const currentCode = savedCode && savedCode.trim() !== '' ? savedCode : codeTemplates[language];
          const tokenData = await analyzeCodeTokens(currentCode, language);
          
          if (tokenData.semantic_tokens && tokenData.semantic_tokens.length > 0) {
            const semanticTokens = tokenData.semantic_tokens.map(token => ({
              range: {
                startLineNumber: token.line + 1,
                startColumn: token.start + 1,
                endLineNumber: token.line + 1,
                endColumn: token.start + token.length + 1
              },
              options: {
                className: `token-${token.tokenType}`,
                inlineClassName: `token-${token.tokenType}`
              }
            }));
            
            // 기존 장식 제거 후 새로운 장식 적용
            if (window.currentDecorations) {
              editorInstance.deltaDecorations(window.currentDecorations, []);
            }
            window.currentDecorations = editorInstance.deltaDecorations([], semanticTokens);
          } else {
            // 토큰이 없으면 기존 장식 제거
            if (window.currentDecorations) {
              editorInstance.deltaDecorations(window.currentDecorations, []);
              window.currentDecorations = null;
            }
          }
        }, 100);
      }
    }
  }, [language, isInitialized, codeTemplates]);

  // 사이드바 상태 저장
  useEffect(() => {
    if (isInitialized) {
      saveData('vscode_runner_sidebar_collapsed', sidebarCollapsed);
    }
  }, [sidebarCollapsed, isInitialized]);

  // 테스트 케이스 저장
  useEffect(() => {
    if (isInitialized) {
      saveData('vscode_runner_test_cases', JSON.stringify(testCases));
    }
  }, [testCases, isInitialized]);

  // 폰트 크기 저장
  useEffect(() => {
    if (isInitialized) {
      saveData('vscode_runner_font_size', fontSize.toString());
    }
  }, [fontSize, isInitialized]);

  // 컴포넌트 마운트 시 저장된 데이터 복구 및 모바일 감지
  useEffect(() => {
    fetchSupportedLanguages();
    loadSavedData();
    checkMobile();
    setIsInitialized(true);
    
    // 윈도우 리사이즈 이벤트 리스너 추가
    const handleResize = () => {
      checkMobile();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [loadSavedData, checkMobile]);

  // 초기 로딩 시 언어 서버 토큰 분석
  useEffect(() => {
    if (isInitialized && editorInstance && code) {
      // 초기 코드에 대한 토큰 분석 실행
      const applyInitialTokens = async () => {
        const tokenData = await analyzeCodeTokens(code, language);
        
        if (tokenData.semantic_tokens && tokenData.semantic_tokens.length > 0) {
          const semanticTokens = tokenData.semantic_tokens.map(token => ({
            range: {
              startLineNumber: token.line + 1,
              startColumn: token.start + 1,
              endLineNumber: token.line + 1,
              endColumn: token.start + token.length + 1
            },
            options: {
              className: `token-${token.tokenType}`,
              inlineClassName: `token-${token.tokenType}`
            }
          }));
          
          // 기존 장식 제거 후 새로운 장식 적용
          if (window.currentDecorations) {
            editorInstance.deltaDecorations(window.currentDecorations, []);
          }
          window.currentDecorations = editorInstance.deltaDecorations([], semanticTokens);
        }
      };
      
      // 약간의 지연 후 토큰 분석 실행 (에디터가 완전히 로드된 후)
      setTimeout(applyInitialTokens, 200);
    }
  }, [isInitialized, editorInstance, code, language]);

  // 새로고침 시 즉시 토큰 분석 실행
  useEffect(() => {
    if (isInitialized && code && !editorInstance) {
      // 에디터가 아직 마운트되지 않았지만 코드가 있는 경우
      // 에디터 마운트를 기다리지 않고 토큰 분석 준비
      const prepareTokens = async () => {
        const tokenData = await analyzeCodeTokens(code, language);
        // 토큰 데이터를 임시 저장 (에디터 마운트 시 사용)
        window.pendingTokens = tokenData;
      };
      
      prepareTokens();
    }
  }, [isInitialized, code, language, editorInstance]);

  // 지원하는 언어 목록 가져오기
  const fetchSupportedLanguages = async () => {
    try {
      const response = await axios.get('/compiler/api/languages');
      setSupportedLanguages(response.data.languages);
    } catch (error) {
      console.error('지원 언어 목록 가져오기 실패:', error);
    }
  };

  useEffect(() => {
    fetchSupportedLanguages();
  }, []);

  // 리사이즈 이벤트 리스너
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e) => handleResizeMove(e);
      const handleTouchMove = (e) => handleResizeMove(e);
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleResizeEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleResizeEnd);
      };
    }
  }, [isResizing]);

  // 테스트 케이스 관리 함수들
  const addTestCase = () => {
    const newId = Math.max(...testCases.map(tc => tc.id), 0) + 1;
    setTestCases([...testCases, {
      id: newId,
      name: `테스트 (${newId})`,
      input: '',
      expected: '',
      isEnabled: true
    }]);
  };

  const removeTestCase = (id) => {
    if (testCases.length > 1) {
      const updatedTestCases = testCases.filter(tc => tc.id !== id);
      // ID를 1부터 순차적으로 재할당하고 이름도 업데이트
      const reorderedTestCases = updatedTestCases.map((tc, index) => ({
        ...tc,
        id: index + 1,
        name: `테스트 (${index + 1})`
      }));
      setTestCases(reorderedTestCases);
      
      // 선택된 테스트 케이스가 삭제된 경우 첫 번째로 변경
      if (selectedTestCase === id) {
        setSelectedTestCase(1);
      }
    }
  };

  const updateTestCase = (id, field, value) => {
    setTestCases(testCases.map(tc => 
      tc.id === id ? { ...tc, [field]: value } : tc
    ));
  };

  const toggleTestCase = (id) => {
    setTestCases(testCases.map(tc => 
      tc.id === id ? { ...tc, isEnabled: !tc.isEnabled } : tc
    ));
  };

  const selectTestCase = (id) => {
    setSelectedTestCase(id);
  };

  // 테스트 케이스 초기화
  const handleResetTestCases = () => {
    if (window.confirm('정말로 모든 테스트 케이스를 초기화하시겠습니까?')) {
      const resetTestCases = [
        { id: 1, name: '테스트 (1)', input: '', expected: '', isEnabled: true }
      ];
      setTestCases(resetTestCases);
      setTestResults([]);
      setSelectedTestCase(1);
      
      // localStorage에서도 제거
      localStorage.removeItem('vscode_runner_test_cases');
      
      alert('테스트 케이스가 초기화되었습니다.');
    }
  };

  // 전체 테스트 실행
  const runAllTests = async () => {
    if (isRunningTests) return;

    const enabledTestCases = testCases.filter(tc => tc.isEnabled);
    if (enabledTestCases.length === 0) {
      alert('활성화된 테스트 케이스가 없습니다.');
      return;
    }

    setIsRunningTests(true);
    setTestResults([]);

    try {
      const response = await axios.post('/compiler/api/batch-test', {
        code,
        language,
        test_cases: enabledTestCases.map(tc => ({
          name: tc.name,
          input_data: tc.input,
          expected_output: tc.expected,
          enabled: tc.isEnabled
        }))
      });

      const jobId = response.data.job_id;
      console.log('배치 테스트 시작:', jobId);

      // 결과 폴링
      const pollResults = async () => {
        try {
          const statusResponse = await axios.get(`/compiler/api/batch-status/${jobId}`);
          const status = statusResponse.data;

          if (status.status === 'completed') {
            // 결과를 프론트엔드 형식으로 변환
            const convertedResults = status.results.map(result => ({
              testCaseId: enabledTestCases.find(tc => tc.name === result.test_case_name)?.id,
              passed: result.passed,
              actual: result.actual_output,
              expected: result.expected_output,
              executionTime: result.execution_time,
              error: result.error
            }));

            setTestResults(convertedResults);
            setIsRunningTests(false);
          } else if (status.status === 'failed') {
            alert('테스트 실행 중 오류가 발생했습니다.');
            setIsRunningTests(false);
          } else {
            // 계속 폴링
            setTimeout(pollResults, 1000);
          }
        } catch (error) {
          console.error('테스트 결과 확인 중 오류:', error);
          setIsRunningTests(false);
        }
      };

      pollResults();

    } catch (error) {
      console.error('배치 테스트 요청 실패:', error);
      setIsRunningTests(false);
    }
  };

  // 코드 실행
  const handleRunCode = async () => {
    if (isLoading) return;

    // 입력 요구 패턴 감지
    const requiresInput = detectInputRequirement(code, language);
    const hasInputData = inputData.trim() !== '';
    
    if (requiresInput && !hasInputData) {
      setShowInputWarning(true);
      return;
    }

    setIsLoading(true);
    setOutput('');
    setError('');
    setExecutionTime(0);
    setCurrentJobId(null);
    setJobStatus('pending');
    setQueuePosition(null);

    try {
      const response = await axios.post('/compiler/api/compile', {
        code,
        language,
        input_data: inputData
      });

      const jobId = response.data.job_id;
      setCurrentJobId(jobId);
      setJobStatus(response.data.status);

      if (response.data.status === 'queued') {
        // 큐에 대기 중인 경우
        const pollQueue = async () => {
          try {
            const statusResponse = await axios.get(`/compiler/api/status/${jobId}`);
            const status = statusResponse.data;

            if (status.status === 'pending' || status.status === 'running') {
              setJobStatus(status.status);
              setQueuePosition(status.queue_position);
              setTimeout(pollQueue, 1000);
            } else if (status.status === 'completed') {
              setOutput(status.output || '');
              setError(status.error || '');
              setExecutionTime(status.execution_time || 0);
              setJobStatus('completed');
              setIsLoading(false);
            } else if (status.status === 'failed') {
              setError(status.error || '실행 중 오류가 발생했습니다.');
              setJobStatus('failed');
              setIsLoading(false);
            }
          } catch (error) {
            console.error('작업 상태 확인 중 오류:', error);
            setError('작업 상태 확인 중 오류가 발생했습니다.');
            setJobStatus('failed');
            setIsLoading(false);
          }
        };

        pollQueue();
      } else {
        // 즉시 실행되는 경우
        const pollResults = async () => {
          try {
            const statusResponse = await axios.get(`/compiler/api/status/${jobId}`);
            const status = statusResponse.data;

            if (status.status === 'pending' || status.status === 'running') {
              setJobStatus(status.status);
              setTimeout(pollResults, 1000);
            } else if (status.status === 'completed') {
              setOutput(status.output || '');
              setError(status.error || '');
              setExecutionTime(status.execution_time || 0);
              setJobStatus('completed');
              setIsLoading(false);
            } else if (status.status === 'failed') {
              setError(status.error || '실행 중 오류가 발생했습니다.');
              setJobStatus('failed');
              setIsLoading(false);
            }
          } catch (error) {
            console.error('작업 상태 확인 중 오류:', error);
            setError('작업 상태 확인 중 오류가 발생했습니다.');
            setJobStatus('failed');
            setIsLoading(false);
          }
        };

        pollResults();
      }

    } catch (error) {
      console.error('코드 실행 요청 실패:', error);
      setError('코드 실행 요청 중 오류가 발생했습니다.');
      setJobStatus('failed');
      setIsLoading(false);
    }
  };

  // 에디터 내용 변경
  const handleEditorChange = (value) => {
    setCode(value || '');
    
    // 언어 서버 토큰 업데이트 (디바운싱 적용)
    if (editorInstance) {
      clearTimeout(window.tokenUpdateTimeout);
      window.tokenUpdateTimeout = setTimeout(async () => {
        const tokenData = await analyzeCodeTokens(value || '', language);
        
        if (tokenData.semantic_tokens && tokenData.semantic_tokens.length > 0) {
          const semanticTokens = tokenData.semantic_tokens.map(token => ({
            range: {
              startLineNumber: token.line + 1,
              startColumn: token.start + 1,
              endLineNumber: token.line + 1,
              endColumn: token.start + token.length + 1
            },
            options: {
              className: `token-${token.tokenType}`,
              inlineClassName: `token-${token.tokenType}`
            }
          }));
          
          // 기존 장식 제거 후 새로운 장식 적용
          if (window.currentDecorations) {
            editorInstance.deltaDecorations(window.currentDecorations, []);
          }
          window.currentDecorations = editorInstance.deltaDecorations([], semanticTokens);
        } else {
          // 토큰이 없으면 기존 장식 제거
          if (window.currentDecorations) {
            editorInstance.deltaDecorations(window.currentDecorations, []);
            window.currentDecorations = null;
          }
        }
      }, 500); // 300ms 디바운싱
    }
  };

  // 경고창 닫기
  const handleCloseWarning = () => {
    setShowInputWarning(false);
  };

  // 경고창에서 실행 계속
  const handleContinueExecution = async () => {
    setShowInputWarning(false);
    
    setIsLoading(true);
    setOutput('');
    setError('');
    setExecutionTime(0);
    setCurrentJobId(null);
    setJobStatus('pending');
    setQueuePosition(null);

    try {
      const response = await axios.post('/compiler/api/compile', {
        code,
        language,
        input_data: inputData
      });

      const jobId = response.data.job_id;
      setCurrentJobId(jobId);
      setJobStatus(response.data.status);

      if (response.data.status === 'queued') {
        // 큐에 대기 중인 경우
        const pollQueue = async () => {
          try {
            const statusResponse = await axios.get(`/compiler/api/status/${jobId}`);
            const status = statusResponse.data;

            if (status.status === 'pending' || status.status === 'running') {
              setJobStatus(status.status);
              setQueuePosition(status.queue_position);
              setTimeout(pollQueue, 1000);
            } else if (status.status === 'completed') {
              setOutput(status.output || '');
              setError(status.error || '');
              setExecutionTime(status.execution_time || 0);
              setJobStatus('completed');
              setIsLoading(false);
            } else if (status.status === 'failed') {
              setError(status.error || '실행 중 오류가 발생했습니다.');
              setJobStatus('failed');
              setIsLoading(false);
            }
          } catch (error) {
            console.error('작업 상태 확인 중 오류:', error);
            setError('작업 상태 확인 중 오류가 발생했습니다.');
            setJobStatus('failed');
            setIsLoading(false);
          }
        };

        pollQueue();
      } else {
        // 즉시 실행되는 경우
        const pollResults = async () => {
          try {
            const statusResponse = await axios.get(`/compiler/api/status/${jobId}`);
            const status = statusResponse.data;

            if (status.status === 'pending' || status.status === 'running') {
              setJobStatus(status.status);
              setTimeout(pollResults, 1000);
            } else if (status.status === 'completed') {
              setOutput(status.output || '');
              setError(status.error || '');
              setExecutionTime(status.execution_time || 0);
              setJobStatus('completed');
              setIsLoading(false);
            } else if (status.status === 'failed') {
              setError(status.error || '실행 중 오류가 발생했습니다.');
              setJobStatus('failed');
              setIsLoading(false);
            }
          } catch (error) {
            console.error('작업 상태 확인 중 오류:', error);
            setError('작업 상태 확인 중 오류가 발생했습니다.');
            setJobStatus('failed');
            setIsLoading(false);
          }
        };

        pollResults();
      }

    } catch (error) {
      console.error('코드 실행 요청 실패:', error);
      setError('코드 실행 요청 중 오류가 발생했습니다.');
      setJobStatus('failed');
      setIsLoading(false);
    }
  };

  // 코드 초기화
  const handleResetCode = () => {
    if (window.confirm('정말로 코드를 초기화하시겠습니까?')) {
      // 현재 언어의 기본 템플릿으로 초기화
      setCode(codeTemplates[language]);
      
      // localStorage에서 현재 언어의 저장된 코드 제거
      localStorage.removeItem(`vscode_runner_code_${language}`);
    }
  };

  // 리사이즈 핸들러
  const handleResizeStart = (e) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    
    e.preventDefault();
    
    const container = document.querySelector('.vscode-content');
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const mouseY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
    const relativeY = mouseY - containerRect.top;
    
    // 최소/최대 높이 제한
    const minHeight = 200; // 최소 200px
    const maxHeight = containerRect.height - 200; // 최소 200px 남겨두기
    
    if (relativeY >= minHeight && relativeY <= maxHeight) {
      setEditorHeight(`${relativeY}px`);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };

  // 코드에서 입력 요구 패턴 감지
  const detectInputRequirement = (codeText, currentLanguage) => {
    const inputPatterns = {
      python: [
        /input\s*\(/i,
        /raw_input\s*\(/i,
        /getpass\s*\.\s*getpass\s*\(/i
      ],
      cpp: [
        /cin\s*>>/i,
        /getline\s*\(/i,
        /scanf\s*\(/i,
        /gets\s*\(/i,
        /fgets\s*\(/i
      ],
      c: [
        /scanf\s*\(/i,
        /gets\s*\(/i,
        /fgets\s*\(/i,
        /getchar\s*\(/i,
        /getc\s*\(/i
      ],
      java: [
        /Scanner\s*\(/i,
        /System\.in/i,
        /BufferedReader\s*\(/i,
        /InputStreamReader\s*\(/i
      ],
      javascript: [
        /readline\s*\(/i,
        /prompt\s*\(/i,
        /process\.stdin/i,
        /require\s*\(\s*['"]readline['"]\s*\)/i
      ]
    };
    
    const patterns = inputPatterns[currentLanguage] || [];
    return patterns.some(pattern => pattern.test(codeText));
  };

  // 언어 서버 토큰 분석
  const analyzeCodeTokens = async (codeText, currentLanguage) => {
    try {
      const response = await axios.post('/compiler/api/language-server', {
        language: currentLanguage,
        code: codeText
      });
      
      return response.data;
    } catch (error) {
      console.error('언어 서버 토큰 분석 실패:', error);
      return { tokens: [], semantic_tokens: [] };
    }
  };

  // Monaco Editor 설정
  const monacoOptions = {
    minimap: { enabled: false },
    fontSize: fontSize,
    lineNumbers: 'on',
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    folding: true,
    lineDecorationsWidth: 10,
    lineNumbersMinChars: 3,
    theme: 'vs-dark',
    // 언어 서버 설정
    'semanticHighlighting.enabled': true,
    'editor.semanticHighlighting.enabled': true,
  };

  // 상태 메시지 생성
  const getStatusMessage = () => {
    switch (jobStatus) {
      case 'pending':
        return '실행 준비 중...';
      case 'running':
        return '코드 실행 중...';
      case 'queued':
        return queuePosition ? `대기열에서 대기 중... (위치: ${queuePosition})` : '대기열에서 대기 중...';
      case 'completed':
        return '실행이 완료되었습니다.';
      case 'failed':
        return '실행 중 오류가 발생했습니다.';
      default:
        return '실행 결과가 여기에 표시됩니다.';
    }
  };

  // 백준 예제 가져오기
  const handleImportBaekjoon = async () => {
    if (!baekjoonInput.trim()) {
      alert('백준 문제 링크나 번호를 입력해주세요.');
      return;
    }

    // 기존 테스트 케이스가 있으면 확인
    if (testCases.length > 1 || (testCases.length === 1 && testCases[0].input.trim() !== '')) {
      const confirmed = window.confirm(
        '기존 테스트 케이스가 있습니다. 백준 예제로 교체하시겠습니까?\n기존 데이터는 모두 삭제됩니다.'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsImportingBaekjoon(true);
    
    try {
      const response = await axios.post('/compiler/api/baekjoon-parse', {
        problem_input: baekjoonInput.trim()
      });
      
      console.log('백준 API 응답:', response.data); // 디버깅용
      
      if (response.data.success) {
        const importedTestCases = response.data.test_cases;
        
        // 문제 번호 추출 (백준 링크에서 또는 직접 입력된 번호)
        let problemNumber = '';
        if (baekjoonInput.includes('acmicpc.net/problem/')) {
          const match = baekjoonInput.match(/problem\/(\d+)/);
          problemNumber = match ? match[1] : '';
        } else {
          problemNumber = baekjoonInput.trim();
        }
        
        // 기존 테스트 케이스를 모두 제거하고 백준 예제로 교체
        const newTestCases = importedTestCases.map((tc, index) => ({
          id: index + 1,
          name: `백준(${problemNumber}) 예제 ${index + 1}`,
          input: tc.input_data || '',
          expected: tc.expected_output || '',
          isEnabled: true
        }));
        
        setTestCases(newTestCases);
        setSelectedTestCase(1);
        setTestResults([]); // 기존 테스트 결과도 초기화
        setBaekjoonInput('');
        setShowBaekjoonModal(false);
        
        alert(`백준 문제 ${problemNumber}의 예제 ${importedTestCases.length}개를 성공적으로 가져왔습니다.`);
      } else {
        alert(response.data.message || '백준 예제 가져오기에 실패했습니다.');
      }
    } catch (error) {
      console.error('백준 예제 가져오기 실패:', error);
      if (error.response?.data?.detail) {
        alert(`백준 예제 가져오기 실패: ${error.response.data.detail}`);
      } else {
        alert('백준 예제 가져오기 중 오류가 발생했습니다.');
      }
    } finally {
      setIsImportingBaekjoon(false);
    }
  };

  // 폰트 크기 조정 함수들
  const increaseFontSize = () => {
    setFontSize(prev => Math.min(prev + 1, 24)); // 최대 24px
  };

  const decreaseFontSize = () => {
    setFontSize(prev => Math.max(prev - 1, 10)); // 최소 10px
  };

  const resetFontSize = () => {
    setFontSize(14); // 기본값으로 리셋
  };

  // 백준 문제 번호 추출 함수
  const extractBaekjoonProblemNumber = (testCaseName) => {
    if (!testCaseName || !testCaseName.includes('백준')) return null;
    
    // "백준(10718) 예제 1" 형식에서 10718 추출
    const match = testCaseName.match(/백준\((\d+)\)/);
    return match ? match[1] : null;
  };

  // 백준 문제 내용 가져오기 함수
  const fetchBaekjoonProblemContent = async (problemNumber) => {
    try {
      const response = await axios.get(`/compiler/api/baekjoon-problem/${problemNumber}`);
      if (response.data.success) {
        return response.data.problem_content;
      }
    } catch (error) {
      console.error('백준 문제 내용 가져오기 실패:', error);
    }
    return null;
  };

  // AI 힌트 캐시 키 생성 함수
  const generateCacheKey = (language, code, failedTestCase) => {
    // 안전한 해시 생성 (한글 등 비-Latin1 문자 처리)
    const codeHash = generateSafeHash(code);
    const testCaseKey = `${failedTestCase.testCaseName || failedTestCase.name}_${failedTestCase.expected}_${failedTestCase.actual}`;
    return `${language}_${codeHash}_${testCaseKey}`;
  };

  // 안전한 해시 생성 함수
  const generateSafeHash = (str) => {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32비트 정수로 변환
    }
    
    // 양수로 변환하고 16진수로 변환
    return Math.abs(hash).toString(16).slice(0, 8);
  };

  // 텍스트를 코드 블록과 일반 텍스트로 분리하여 렌더링하는 함수
  const renderTextWithCodeBlocks = (text) => {
    if (!text) return null;
    
    // 코드 블록 패턴: ```언어\n코드\n```
    const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockPattern.exec(text)) !== null) {
      // 코드 블록 이전의 일반 텍스트
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }
      
      // 코드 블록
      const language = match[1] || 'text';
      const code = match[2];
      parts.push({
        type: 'code',
        language: language,
        content: code
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    // 마지막 코드 블록 이후의 일반 텍스트
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <div key={index} className="code-block">
            <div className="code-header">
              <span className="code-language">{part.language}</span>
              <button 
                className="copy-code-btn"
                onClick={() => copyToClipboard(part.content)}
                title="코드 복사"
              >
                📋
              </button>
            </div>
            <pre className="code-content">
              <code>{part.content}</code>
            </pre>
          </div>
        );
      } else {
        return (
          <div key={index} className="text-content">
            {part.content}
          </div>
        );
      }
    });
  };

  // 클립보드에 코드 복사하는 함수
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // 복사 성공 알림 (선택사항)
      console.log('코드가 클립보드에 복사되었습니다.');
    } catch (err) {
      console.error('클립보드 복사 실패:', err);
      // 폴백: 구형 브라우저 지원
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  // AI 힌트 요청 함수
  const requestAIHint = async (failedTestCase) => {
    if (isLoadingAIHint) return;
    
    // 캐시 키 생성
    const cacheKey = generateCacheKey(language, code, failedTestCase);
    
    // 캐시에서 기존 힌트 확인
    if (aiHintCache.has(cacheKey)) {
      console.log('캐시된 AI 힌트 사용:', cacheKey);
      setAiHint(aiHintCache.get(cacheKey));
      setShowAIHintModal(true);
      return;
    }
    
    setIsLoadingAIHint(true);
    setAiHint(null);
    
    try {
      // 백준 문제 컨텍스트 확인 및 문제 내용 가져오기
      let problemContext = null;
      const testCaseName = failedTestCase.testCaseName || failedTestCase.name;
      const problemNumber = extractBaekjoonProblemNumber(testCaseName);
      
      if (problemNumber) {
        console.log(`백준 문제 ${problemNumber} 내용 가져오기 시작`);
        const problemContent = await fetchBaekjoonProblemContent(problemNumber);
        if (problemContent) {
          problemContext = `백준 ${problemNumber}번 문제:\n${problemContent}`;
          console.log('백준 문제 내용 가져오기 성공');
        } else {
          problemContext = `백준 ${problemNumber}번 문제입니다.`;
          console.log('백준 문제 내용 가져오기 실패, 기본 컨텍스트 사용');
        }
      } else if (testCases.some(tc => tc.name.includes('백준'))) {
        // 백준 문제이지만 번호를 추출할 수 없는 경우
        problemContext = "백준 온라인 저지 문제입니다.";
      }
      
      // 요청 데이터 구성
      const requestData = {
        language,
        code,
        failed_test_case: {
          test_case_name: failedTestCase.testCaseName || failedTestCase.name,
          input_data: failedTestCase.input || failedTestCase.input_data || "",  // 빈 문자열이라도 필수
          expected_output: failedTestCase.expected || failedTestCase.expected_output,
          actual_output: failedTestCase.actual || failedTestCase.actual_output,
          error: failedTestCase.error,
          passed: false,  // AI 힌트를 요청하는 것은 실패한 테스트이므로 false
          execution_time: failedTestCase.executionTime || 0.1  // 실행 시간 또는 기본값
        },
        problem_context: problemContext,
        all_test_cases: testCases.map(tc => ({
          name: tc.name,
          input_data: tc.input,
          expected_output: tc.expected
        }))
      };
      
      // 디버깅을 위한 로깅
      console.log('AI 힌트 요청 데이터:', requestData);
      console.log('failedTestCase 객체:', failedTestCase);
      console.log('캐시 키:', cacheKey);
      
      const response = await axios.post('/compiler/api/ai-hint', requestData);
      
      if (response.data.success) {
        // 응답을 캐시에 저장
        setAiHintCache(prevCache => {
          const newCache = new Map(prevCache);
          newCache.set(cacheKey, response.data);
          return newCache;
        });
        
        setAiHint(response.data);
        setShowAIHintModal(true);
      } else {
        alert(`AI 힌트 생성 실패: ${response.data.message}`);
      }
    } catch (error) {
      console.error('AI 힌트 요청 실패:', error);
      if (error.response?.data?.message) {
        alert(`AI 힌트 요청 실패: ${error.response.data.message}`);
      } else {
        alert('AI 힌트 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoadingAIHint(false);
    }
  };

  // AI 힌트 모달 닫기
  const handleCloseAIHintModal = () => {
    setShowAIHintModal(false);
    setAiHint(null);
  };

  // 백준 모달 닫기
  const handleCloseBaekjoonModal = () => {
    setShowBaekjoonModal(false);
    setBaekjoonInput('');
    setIsImportingBaekjoon(false);
  };

  return (
    <div className="vscode-container">
      {/* VSCode 헤더 */}
      <div className="vscode-header">
        <div className="vscode-title-bar">
          <div className="vscode-title">Zerone Code Runner</div>
          <div className="vscode-controls">
            <div className="vscode-control minimize"></div>
            <div className="vscode-control maximize"></div>
            <div className="vscode-control close"></div>
          </div>
        </div>
        <div className="vscode-menu-bar">
          <div className="vscode-menu-item" onClick={() => window.location.href = '/'}>Home</div>
          <div className="vscode-menu-item">Edit</div>
          <div className="vscode-menu-item">View</div>
          <div className="vscode-menu-item">Run</div>
          <div className="vscode-menu-item font-size-controls">
            <button 
              className="font-size-btn decrease"
              onClick={decreaseFontSize}
              title="폰트 크기 줄이기"
            >
              -
            </button>
            <span className="font-size-display">{fontSize}px</span>
            <button 
              className="font-size-btn increase"
              onClick={increaseFontSize}
              title="폰트 크기 늘리기"
            >
              +
            </button>
            {/* <button 
              className="font-size-btn reset"
              onClick={resetFontSize}
              title="폰트 크기 초기화"
            >
              ↺
            </button> */}
          </div>
        </div>
      </div>

      <div className="vscode-main">
        {/* VSCode 사이드바 */}
        <div className={`vscode-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <div className="vscode-sidebar-header">
            <span>EXPLORER</span>
            <button 
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              {sidebarCollapsed ? '>' : '<'}
            </button>
          </div>
          <div className="vscode-sidebar-content">
            <div className="vscode-file-item active">
              <span className="file-icon">📄</span>
              <span>main.{languageConfigs[language]}</span>
            </div>
            <div 
              className={`vscode-file-item ${showInputTerminal ? 'active' : ''}`}
              onClick={() => {
                setShowInputTerminal(true);
                setShowTestCases(false);
              }}
            >
              <span className="file-icon">🖥️</span>
              <span>터미널</span>
            </div>
            <div 
              className={`vscode-file-item ${showTestCases ? 'active' : ''}`}
              onClick={() => {
                setShowTestCases(true);
                setShowInputTerminal(false);
              }}
            >
              <span className="file-icon">⚡</span>
              <span>테스트</span>
            </div>
          </div>
        </div>

        {/* VSCode 메인 영역 - 3분할 레이아웃 */}
        <div className="vscode-content">
          {/* 상단: 코드 에디터 */}
          <div className="vscode-editor-section">
            <div className="vscode-editor-header">
              <div className="header-left">
                <select 
                  className="vscode-language-select"
                  value={language}
                  onChange={(e) => {
                    const newLanguage = e.target.value;
                    setLanguage(newLanguage);
                    
                    // 마지막 사용 언어를 즉시 저장
                    saveData('vscode_runner_language', newLanguage);
                    
                    // 언어 변경 시 즉시 코드 전환
                    const savedCode = localStorage.getItem(`vscode_runner_code_${newLanguage}`);
                    if (savedCode && savedCode.trim() !== '') {
                      setCode(savedCode);
                    } else {
                      setCode(codeTemplates[newLanguage]);
                    }
                  }}
                >
                  {supportedLanguages.length > 0 ? (
                    supportedLanguages.map(lang => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))
                  ) : (
                    Object.keys(codeTemplates).map(lang => (
                      <option key={lang} value={lang}>
                        {lang.toUpperCase()}
                      </option>
                    ))
                  )}
                </select>
                <button 
                  className="vscode-reset-button"
                  onClick={handleResetCode}
                  title="코드 초기화"
                >
                  🗑️ 초기화
                </button>
              </div>
              <div className="header-right">
                <button 
                  className="vscode-test-toggle"
                  onClick={() => {
                    if (showTestCases) {
                      // 테스트 창이 열려있으면 입력/출력으로 전환
                      setShowTestCases(false);
                      setShowInputTerminal(true);
                    } else {
                      // 입력/출력 창이 열려있으면 테스트로 전환
                      setShowTestCases(true);
                      setShowInputTerminal(false);
                    }
                  }}
                  title={showTestCases ? "터미널 패널로 전환" : "테스트 패널로 전환"}
                >
                  {showTestCases ? '🖥️ 터미널 패널' : '⚡ 테스트 패널'}
                </button>
                <button 
                  className="vscode-run-button"
                  onClick={showTestCases ? runAllTests : handleRunCode}
                  disabled={showTestCases ? isRunningTests : isLoading}
                >
                  {showTestCases ? (
                    isRunningTests ? (
                      <>
                        <span className="loading"></span>
                        테스트 중...
                      </>
                    ) : (
                      '🚀 테스트 실행'
                    )
                  ) : (
                    isLoading ? (
                      <>
                        <span className="loading"></span>
                        실행 중...
                      </>
                    ) : (
                      '🚀 코드 실행'
                    )
                  )}
                </button>
              </div>
            </div>
            <Editor
              height={editorHeight}
              language={languageConfigs[language]}
              theme="vs-dark"
              value={code}
              onChange={handleEditorChange}
              onMount={(editor) => {
                setEditorInstance(editor);
                
                // pendingTokens가 있으면 즉시 적용
                if (window.pendingTokens) {
                  const tokenData = window.pendingTokens;
                  delete window.pendingTokens; // 사용 후 삭제
                  
                  if (tokenData.semantic_tokens && tokenData.semantic_tokens.length > 0) {
                    const semanticTokens = tokenData.semantic_tokens.map(token => ({
                      range: {
                        startLineNumber: token.line + 1,
                        startColumn: token.start + 1,
                        endLineNumber: token.line + 1,
                        endColumn: token.start + token.length + 1
                      },
                      options: {
                        className: `token-${token.tokenType}`,
                        inlineClassName: `token-${token.tokenType}`
                      }
                    }));
                    
                    window.currentDecorations = editor.deltaDecorations([], semanticTokens);
                  }
                }
              }}
              options={monacoOptions}
            />
          </div>

          {/* 리사이즈 핸들 */}
          <div 
            className="vscode-resize-handle"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
            onDragStart={(e) => e.preventDefault()}
          >
            <div className="resize-indicator">⋮⋮</div>
          </div>

          {/* 하단: 패널 섹션 */}
          <div className="vscode-panels-section">
            <div className={`vscode-panels-container ${showTestCases ? 'testcases-active' : ''}`}>
              {/* 입력/터미널 패널 (토글) */}
              {showInputTerminal && (
                <>
                  {/* 입력 패널 */}
                  <div className="vscode-input-panel">
                    <div className="panel-header">
                      <span>📝 입력</span>
                    </div>
                    <textarea
                      value={inputData}
                      onChange={(e) => setInputData(e.target.value)}
                      placeholder="프로그램에 전달할 입력 데이터를 입력하세요..."
                      className="vscode-textarea"
                    />
                  </div>

                  {/* 터미널 패널 */}
                  <div className="vscode-terminal-panel">
                    <div className="panel-header">
                      <span>🖥️ 터미널</span>
                      <button 
                        className="vscode-clear-button"
                        onClick={() => {
                          setOutput('');
                          setError('');
                          setExecutionTime(0);
                          setCurrentJobId(null);
                          setJobStatus('idle');
                          setQueuePosition(null);
                          setIsLoading(false);
                        }}
                      >
                        🧹 지우기
                      </button>
                    </div>
                    <div className="vscode-terminal">
                      {isLoading ? (
                        <div className="terminal-loading">
                          <span className="loading"></span>
                          <span>{getStatusMessage()}</span>
                        </div>
                      ) : error ? (
                        <div className="terminal-error">
                          <div className="terminal-prompt">$</div>
                          <div className="terminal-content">
                            <span className="error-text">오류:</span><br />
                            <div className="error-message">
                              {error.split('\n').map((line, index) => (
                                <div key={index} className="error-line">
                                  {line}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : output ? (
                        <div className="terminal-success">
                          <div className="terminal-prompt">$</div>
                          <div className="terminal-content">
                            {output}
                          </div>
                        </div>
                      ) : (
                        <div className="terminal-empty">
                          <div className="terminal-prompt">$</div>
                          <div className="terminal-content">
                            {getStatusMessage()}
                          </div>
                        </div>
                      )}
                      
                      {executionTime > 0 && (
                        <div className="terminal-execution-time">
                          실행 시간: {executionTime.toFixed(3)}초
                        </div>
                      )}
                      
                      {currentJobId && (
                        <div className="terminal-job-id">
                          작업 ID: {currentJobId}
                          {queuePosition && (
                            <span className="queue-position"> | 대기열 위치: {queuePosition}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* 테스트 케이스 패널 (토글) */}
              {showTestCases && (
                <div className="vscode-testcases-panel">
                  <div className="panel-header">
                    <div className="header-left">
                      <span>⚡ 테스트</span>
                      {testResults.length > 0 && (
                        <div className="test-summary">
                          <span className="test-summary-text">
                            {testResults.filter(r => r.passed).length}/{testCases.filter(tc => tc.isEnabled).length} 성공
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="header-right">
                      <button 
                        className="vscode-reset-button"
                        onClick={handleResetTestCases}
                        title="테스트 케이스 초기화"
                      >
                        🗑️ 초기화
                      </button>
                      <button 
                        className="vscode-baekjoon-button"
                        onClick={() => setShowBaekjoonModal(true)}
                        title="백준 예제 가져오기"
                      >
                        ➕ 백준 예제
                      </button>
                      <button 
                        className="vscode-add-button"
                        onClick={addTestCase}
                        title="테스트 케이스 추가"
                      >
                        ➕ 테스트 추가
                      </button>
                    </div>
                  </div>
                  {isMobile ? (
                    // 모바일용 카드 레이아웃
                    <div className="vscode-testcases-cards">
                      {testCases.map(tc => {
                        const result = testResults.find(r => r.testCaseId === tc.id);
                        return (
                          <div key={tc.id} className={`testcase-card ${tc.isEnabled ? 'enabled' : 'disabled'}`}>
                            <div className="testcase-card-header">
                              <div className="testcase-name-display">
                                {tc.name}
                              </div>
                              <div className="testcase-card-controls">
                                <label className="testcase-checkbox-container">
                                  <input 
                                    type="checkbox" 
                                    checked={tc.isEnabled} 
                                    onChange={() => toggleTestCase(tc.id)}
                                    className="testcase-checkbox"
                                  />
                                  <span className="testcase-checkbox-label">활성</span>
                                </label>
                                <button 
                                  onClick={() => removeTestCase(tc.id)} 
                                  disabled={testCases.length <= 1}
                                  className="vscode-delete-button"
                                  title="테스트 케이스 삭제"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="testcase-card-content">
                              <div className="testcase-input-group">
                                <label>입력:</label>
                                <textarea 
                                  value={tc.input} 
                                  onChange={e => updateTestCase(tc.id, 'input', e.target.value)} 
                                  className="testcase-input"
                                  placeholder="테스트 입력 데이터를 입력하세요"
                                />
                              </div>
                              <div className="testcase-expected-group">
                                <label>예상 출력:</label>
                                <textarea 
                                  value={tc.expected} 
                                  onChange={e => updateTestCase(tc.id, 'expected', e.target.value)} 
                                  className="testcase-expected"
                                  placeholder="예상되는 출력 결과를 입력하세요"
                                />
                              </div>
                              <div className="testcase-result-group">
                                <label>결과:</label>
                                {result ? (
                                  <div className={`testcase-result ${result.passed ? 'success' : 'failed'}`}>
                                    <div className="result-header">
                                      <span className="result-status">
                                        {result.passed ? '✅ 성공' : '❌ 실패'}
                                      </span>
                                      {!result.passed && (
                                        <button 
                                          className="ai-hint-btn"
                                          onClick={() => requestAIHint({...result, name: tc.name, input: tc.input, expected: tc.expected})}
                                          disabled={isLoadingAIHint}
                                          title="AI 힌트 요청"
                                        >
                                          {isLoadingAIHint ? '🤔 분석 중...' : '🤖 AI 힌트'}
                                        </button>
                                      )}
                                    </div>
                                    {result.error && (
                                      <div className="result-error">{result.error}</div>
                                    )}
                                    {!result.error && (
                                      <div className="result-actual">
                                        <pre>{result.actual}</pre>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`result-pending ${isRunningTests ? 'running' : 'pending'}`}>
                                    {isRunningTests ? "실행 중..." : "테스트 전"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    // 데스크톱용 카드 레이아웃
                    <div className="vscode-testcases-cards desktop">
                      {testCases.map(tc => {
                        const result = testResults.find(r => r.testCaseId === tc.id);
                        return (
                          <div key={tc.id} className={`testcase-card ${tc.isEnabled ? 'enabled' : 'disabled'}`}>
                            <div className="testcase-card-header">
                              <div className="testcase-name-display">
                                {tc.name}
                              </div>
                              <div className="testcase-card-controls">
                                <label className="testcase-checkbox-container">
                                  <input 
                                    type="checkbox" 
                                    checked={tc.isEnabled} 
                                    onChange={() => toggleTestCase(tc.id)}
                                    className="testcase-checkbox"
                                  />
                                  <span className="testcase-checkbox-label">활성</span>
                                </label>
                                <button 
                                  onClick={() => removeTestCase(tc.id)} 
                                  disabled={testCases.length <= 1}
                                  className="vscode-delete-button"
                                  title="테스트 케이스 삭제"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <div className="testcase-card-content desktop-layout">
                              <div className="testcase-input-group">
                                <label>입력:</label>
                                <textarea 
                                  value={tc.input} 
                                  onChange={e => updateTestCase(tc.id, 'input', e.target.value)} 
                                  className="testcase-input"
                                  placeholder="테스트 입력 데이터를 입력하세요"
                                />
                              </div>
                              <div className="testcase-expected-group">
                                <label>예상 출력:</label>
                                <textarea 
                                  value={tc.expected} 
                                  onChange={e => updateTestCase(tc.id, 'expected', e.target.value)} 
                                  className="testcase-expected"
                                  placeholder="예상되는 출력 결과를 입력하세요"
                                />
                              </div>
                              <div className="testcase-result-group">
                                <label>결과:</label>
                                {result ? (
                                  <div className={`testcase-result ${result.passed ? 'success' : 'failed'}`}>
                                    <div className="result-header">
                                      <span className="result-status">
                                        {result.passed ? '✅ 성공' : '❌ 실패'}
                                      </span>
                                      {!result.passed && (
                                        <button 
                                          className="ai-hint-btn"
                                          onClick={() => requestAIHint({...result, name: tc.name, input: tc.input, expected: tc.expected})}
                                          disabled={isLoadingAIHint}
                                          title="AI 힌트 요청"
                                        >
                                          {isLoadingAIHint ? '🤔 분석 중...' : '🤖 AI 힌트'}
                                        </button>
                                      )}
                                    </div>
                                    {result.error && (
                                      <div className="result-error">{result.error}</div>
                                    )}
                                    {!result.error && (
                                      <div className="result-actual">
                                        <pre>{result.actual}</pre>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className={`result-pending ${isRunningTests ? 'running' : 'pending'}`}>
                                    {isRunningTests ? "실행 중..." : "테스트 전"}
                                  </span>
                                )}
                              </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* VSCode 상태바 */}
      <div className="vscode-status-bar">
        <div className="status-left">
          <span className="status-item">{language.toUpperCase()}</span>
          <span className="status-item">UTF-8</span>
          <span className="status-item">LF</span>
        </div>
        <div className="status-right">
          <span className="status-item">Ln 1, Col 1</span>
          <span className="status-item">Spaces: 4</span>
          {currentJobId && <span className="status-item">Job: {currentJobId.slice(0, 8)}...</span>}
        </div>
      </div>

      {/* 입력 데이터 경고창 */}
      {showInputWarning && (
        <div className="warning-overlay">
          <div className="warning-modal">
            <div className="warning-header">
              <span className="warning-icon">⚠️</span>
              <span className="warning-title">입력 데이터 확인</span>
            </div>
            <div className="warning-content">
              <p>코드에서 사용자 입력을 요구하는 함수가 감지되었습니다.</p>
              <p>입력 데이터가 설정되지 않았습니다. 정말 실행하시겠습니까?</p>
            </div>
            <div className="warning-buttons">
              <button 
                className="warning-button cancel"
                onClick={handleCloseWarning}
              >
                아니요
              </button>
              <button 
                className="warning-button continue"
                onClick={handleContinueExecution}
              >
                그냥 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 백준 예제 가져오기 모달 */}
      {showBaekjoonModal && (
        <div className="baekjoon-overlay">
          <div className="baekjoon-modal">
            <div className="baekjoon-header">
              <span className="baekjoon-title">백준 예제 가져오기</span>
              <button 
                className="baekjoon-close-button"
                onClick={handleCloseBaekjoonModal}
                title="닫기"
              >
                ×
              </button>
            </div>
            <div className="baekjoon-content">
              <div className="baekjoon-input-group">
                <label htmlFor="baekjoon-input">백준 문제 링크 또는 문제 번호:</label>
                <input
                  id="baekjoon-input"
                  type="text"
                  value={baekjoonInput}
                  onChange={(e) => setBaekjoonInput(e.target.value)}
                  placeholder="예: 1000 또는 https://www.acmicpc.net/problem/1000"
                  className="baekjoon-input"
                  disabled={isImportingBaekjoon}
                />
              </div>
              <div className="baekjoon-examples">
                <h4>사용 예시:</h4>
                <ul>
                  <li>문제 링크: <code>https://www.acmicpc.net/problem/1000</code></li>
                  <li>문제 번호: <code>1000</code></li>
                </ul>
              </div>
            </div>
            <div className="baekjoon-buttons">
              <button 
                className="baekjoon-cancel-button"
                onClick={handleCloseBaekjoonModal}
                disabled={isImportingBaekjoon}
              >
                취소
              </button>
              <button 
                className="baekjoon-import-button"
                onClick={handleImportBaekjoon}
                disabled={!baekjoonInput.trim() || isImportingBaekjoon}
              >
                {isImportingBaekjoon ? (
                  <>
                    <span className="loading"></span>
                    가져오는 중...
                  </>
                ) : (
                  '예제 가져오기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 힌트 모달 */}
      {showAIHintModal && aiHint && (
        <div className="ai-hint-overlay">
          <div className="ai-hint-modal">
            <div className="ai-hint-header">
              <span className="ai-hint-title">🤖 AI 문제 해결 힌트</span>
              <button 
                className="ai-hint-close-button"
                onClick={handleCloseAIHintModal}
                title="닫기"
              >
                ×
              </button>
            </div>
            <div className="ai-hint-content">
              <div className="ai-hint-section">
                <h4>🔍 문제 분석</h4>
                <div className="ai-hint-text">
                  {renderTextWithCodeBlocks(aiHint.analysis)}
                </div>
              </div>
              <div className="ai-hint-section">
                <h4>💡 해결 힌트</h4>
                <div className="ai-hint-text">
                  {renderTextWithCodeBlocks(aiHint.hint)}
                </div>
              </div>
              <div className="ai-hint-section">
                <h4>🚀 개선 제안</h4>
                <ul>
                  {aiHint.suggestions.map((suggestion, index) => (
                    <li key={index}>
                      {renderTextWithCodeBlocks(suggestion)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="ai-hint-footer">
              <button 
                className="ai-hint-close-button-footer"
                onClick={handleCloseAIHintModal}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App; 