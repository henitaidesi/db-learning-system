import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Settings, Sparkles, Key, Loader2, Bot, User, Maximize2, Minimize2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Rnd } from 'react-rnd';

interface AIChatWindowProps {
  currentQuestion: any;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

export const AIChatWindow: React.FC<AIChatWindowProps> = ({ currentQuestion }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiFormat, setApiFormat] = useState('google'); // 'google' | 'openai'
  const [modelName, setModelName] = useState('gemini-1.5-flash');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [rndState, setRndState] = useState({
    x: typeof window !== 'undefined' ? Math.max(0, window.innerWidth - 420) : 0,
    y: typeof window !== 'undefined' ? 20 : 0,
    width: 400,
    height: 600
  });

  const toggleExpand = () => {
    if (!isExpanded) {
      setRndState({
        x: window.innerWidth * 0.1,
        y: window.innerHeight * 0.05,
        width: window.innerWidth * 0.8,
        height: window.innerHeight * 0.9,
      });
    } else {
      setRndState({
        x: Math.max(0, window.innerWidth - 420),
        y: 20,
        width: 400,
        height: 600
      });
    }
    setIsExpanded(!isExpanded);
  };

  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    const storedBaseUrl = localStorage.getItem('gemini_base_url');
    const storedFormat = localStorage.getItem('gemini_api_format');
    const storedModelName = localStorage.getItem('gemini_model_name');
    if (storedKey) setApiKey(storedKey);
    if (storedBaseUrl) setBaseUrl(storedBaseUrl);
    if (storedFormat) setApiFormat(storedFormat);
    if (storedModelName) setModelName(storedModelName);
    
    // Add initial greeting
    setMessages([
      {
        id: 'initial',
        role: 'ai',
        text: '你好！我是你的专属数据库学习助手。对于当前题目有任何不明白的地方，都可以随时问我！'
      }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const saveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKey);
    localStorage.setItem('gemini_base_url', baseUrl);
    localStorage.setItem('gemini_api_format', apiFormat);
    localStorage.setItem('gemini_model_name', modelName || 'gemini-1.5-flash');
    setIsSettingsOpen(false);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    if (!apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    const userText = inputText.trim();
    setInputText('');
    
    const newUserMsg: Message = { id: Date.now().toString(), role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Construct system prompt with current question context
      const contextPrompt = `
你是一个专业的数据库系统(Database Systems)学习助手。你正在辅导一名学生。
学生当前正在看这道题目：
【题目类型】：${currentQuestion?.type || '未知'}
【题目内容】：${currentQuestion?.question || '暂无内容'}
${currentQuestion?.options ? `【选项】：\n${currentQuestion.options.map((o: any) => `${o.label}: ${o.text}`).join('\n')}` : ''}
${currentQuestion?.explanation ? `【正确答案及解析】：\n${currentQuestion.explanation}` : ''}

请基于这道题目的上下文，回答学生的提问。如果学生的提问与题目无关，也可以正常解答。回答要专业、易懂，可以使用 Markdown。
`;

      let text = '';

      if (apiFormat === 'openai') {
        const endpoint = baseUrl ? baseUrl.trim().replace(/\/$/, '') : 'https://api.openai.com/v1';
        const url = endpoint.endsWith('/chat/completions') ? endpoint : `${endpoint}/chat/completions`;
        
        const openAiMessages = [
          { role: 'system', content: contextPrompt },
          ...messages.slice(1).map(msg => ({
            role: msg.role === 'ai' ? 'assistant' : 'user',
            content: msg.text
          })),
          { role: 'user', content: userText }
        ];

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName || 'gemini-1.5-flash',
            messages: openAiMessages
          })
        });

        if (!response.ok) {
          throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        text = data.choices[0]?.message?.content || '';
      } else {
        const genAI = new GoogleGenerativeAI(apiKey);
        const requestOptions = baseUrl ? { baseUrl: baseUrl.trim().replace(/\/$/, '') } : {};
        const model = genAI.getGenerativeModel({ model: modelName || "gemini-1.5-flash" }, requestOptions);

        const history = messages.slice(1).map(msg => ({
          role: msg.role === 'ai' ? 'model' : 'user',
          parts: [{ text: msg.text }]
        }));

        const chat = model.startChat({
          systemInstruction: contextPrompt,
          history: history,
        });

        const result = await chat.sendMessage(userText);
        const response = await result.response;
        text = response.text();
      }

      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text }]);
    } catch (error: any) {
      console.error(error);
      let errorMsg = '抱歉，请求大模型时出现错误。请检查网络或 API Key 是否正确。';
      
      if (error.message?.includes('API key not valid') || error.message?.includes('401')) {
        errorMsg = 'API Key 无效或未授权，请点击右上角设置重新配置。';
      } else if (error.message?.includes('OpenAI API Error')) {
        errorMsg = `请求被中转平台拒绝 (${error.message})。如果你使用的是 PackyAPI 等平台，请确保 Base URL 以 "/v1" 结尾（例如：https://api-slb.packyapi.com/v1），并且接口格式选择了“OpenAI 兼容格式”。`;
      }
      
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: errorMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button className="ai-chat-trigger" onClick={() => setIsOpen(true)}>
        <Sparkles size={20} />
        <span>呼叫 AI 导师</span>
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <Rnd
          size={{ width: rndState.width, height: rndState.height }}
          position={{ x: rndState.x, y: rndState.y }}
          onDragStop={(_e, d) => {
            setRndState(prev => ({ ...prev, x: d.x, y: d.y }));
          }}
          onResizeStop={(_e, _direction, ref, _delta, position) => {
            setRndState({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
              ...position
            });
          }}
          minWidth={320}
          minHeight={400}
          bounds="window"
          dragHandleClassName="ai-chat-header"
          enableResizing={true}
          style={{ zIndex: 1000, position: 'fixed' }}
          resizeHandleComponent={{
            bottomRight: (
              <div style={{ position: 'absolute', right: '6px', bottom: '6px', opacity: 0.4, color: 'var(--text-secondary)' }}>
                <svg width="12" height="12" viewBox="0 0 10 10">
                  <path d="M 8 10 L 10 10 L 10 8 Z M 4 10 L 6 10 L 10 6 L 10 4 Z M 0 10 L 2 10 L 10 2 L 10 0 Z" fill="currentColor" />
                </svg>
              </div>
            )
          }}
        >
          <div className="ai-chat-window" style={{ width: '100%', height: '100%', position: 'relative', bottom: 'auto', right: 'auto', transform: 'none', resize: 'none', margin: 0, opacity: 1, pointerEvents: 'auto' }}>
            <div 
              className="ai-chat-header" 
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => (e.currentTarget.style.cursor = 'grabbing')}
              onMouseUp={(e) => (e.currentTarget.style.cursor = 'grab')}
              onMouseLeave={(e) => (e.currentTarget.style.cursor = 'grab')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-primary)' }} />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>AI 辅导老师</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="icon-btn-small" onClick={toggleExpand} title={isExpanded ? "还原" : "放大"} onPointerDown={(e) => e.stopPropagation()}>
                  {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button className="icon-btn-small" onClick={() => setIsSettingsOpen(!isSettingsOpen)} title="配置" onPointerDown={(e) => e.stopPropagation()}>
                  <Settings size={16} />
                </button>
                <button className="icon-btn-small" onClick={() => setIsOpen(false)} title="关闭" onPointerDown={(e) => e.stopPropagation()}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {isSettingsOpen ? (
              <div className="ai-chat-settings">
                <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Key size={16} /> 配置 AI 导师 (Gemini)
                </h4>
                
                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>API Key</label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="输入你的 API Key"
                  className="styled-input"
                  style={{ width: '100%', marginBottom: '1rem', padding: '0.6rem' }}
                />

                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>代理/代理转发地址 (可选)</label>
                <input 
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="例如: https://api.xxx.com/v1"
                  className="styled-input"
                  style={{ width: '100%', marginBottom: '1rem', padding: '0.6rem' }}
                />

                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>接口格式</label>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="radio" name="apiFormat" value="google" checked={apiFormat === 'google'} onChange={() => setApiFormat('google')} />
                    Google 官方格式
                  </label>
                  <label style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}>
                    <input type="radio" name="apiFormat" value="openai" checked={apiFormat === 'openai'} onChange={() => setApiFormat('openai')} />
                    OpenAI 兼容格式
                  </label>
                </div>

                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>模型名称 (Model)</label>
                <input 
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  placeholder="默认: gemini-1.5-flash"
                  className="styled-input"
                  style={{ width: '100%', marginBottom: '1rem', padding: '0.6rem' }}
                />

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                  如果你使用的是第三方中转服务（如 Packy 等），请选择 **OpenAI 兼容格式**。官方 API 请选择 **Google 官方格式**。<br/>
                  如需使用 OpenAI 官方或其他模型，请修改模型名称（例如: gpt-4o-mini）。<br/><br/>
                  注意：所有配置仅保存在你的浏览器本地。
                </p>
                <button className="btn btn-primary" onClick={saveSettings} style={{ width: '100%' }}>
                  保存配置并返回
                </button>
              </div>
            ) : (
              <>
                <div className="ai-chat-body" style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`message-bubble-wrapper ${msg.role}`}>
                      <div className="message-avatar">
                        {msg.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
                      </div>
                      <div className={`message-bubble ${msg.role}`}>
                        {msg.role === 'ai' ? (
                          <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message-bubble-wrapper ai">
                      <div className="message-avatar">
                        <Bot size={16} />
                      </div>
                      <div className="message-bubble ai typing-indicator">
                        <Loader2 size={14} className="spin-icon" /> 正在思考...
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="ai-chat-input-area">
                  <textarea
                    placeholder={apiKey ? "输入你的问题，按回车发送..." : "请先点击右上角设置 API Key"}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || !apiKey}
                    rows={1}
                  />
                  <button 
                    className={`send-btn ${!inputText.trim() || isLoading || !apiKey ? 'disabled' : ''}`}
                    onClick={handleSendMessage}
                    disabled={!inputText.trim() || isLoading || !apiKey}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        </Rnd>
      )}
    </>
  );
};
