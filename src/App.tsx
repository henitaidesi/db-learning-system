import { useState, useMemo, useEffect } from 'react'
import { Database, Lightbulb, ChevronRight, ChevronLeft, CheckCircle2, XCircle, Edit3, ShieldAlert, LayoutDashboard, Network, ChevronDown, ChevronRight as IconRight, Shuffle } from 'lucide-react'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import './App.css'
import questionsDataRaw from './assets/questions.json'
import { AIChatWindow } from './components/AIChatWindow'
import dictionaryData from './assets/dictionary.json'

const renderLatexText = (text: string) => {
  if (!text) return text;
  const parts = text.split(/(\$[^\$]+\$)/g);
  return parts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      let math = part.slice(1, -1);
      // Bypass JS string escaping and KaTeX parsing issues by using direct Unicode math symbols
      math = math
        .replace(/\r/g, '') // Remove stray carriage returns
        .replace(/\\ightarrow/g, ' → ')
        .replace(/\\rightarrow/g, ' → ')
        .replace(/\\to/g, ' → ')
        .replace(/\\subset/g, ' ⊂ ')
        .replace(/\\notin/g, ' ∉ ');
      return <InlineMath key={i} math={math} />;
    }
    
    const highlightPattern = /(【背景信息.*】|【题目】:|^\d+\.\s|\n\d+\.\s|^\(\d+\):\s|\n\(\d+\):\s)/g;
    const subParts = part.split(highlightPattern);
    return (
      <span key={i}>
        {subParts.map((subPart, j) => {
          if (subPart && subPart.match(highlightPattern)) {
            return <strong key={j} style={{ color: 'var(--primary-color)', fontSize: '1.05em' }}>{subPart}</strong>;
          }
          return <span key={j}>{subPart}</span>;
        })}
      </span>
    );
  });
};
import mindmapDataRaw from './assets/mindmap.json'

const questionsData = questionsDataRaw.map(q => {
  let type = (q as any).type || 'choice';
  let question = q.question || '';
  let answer = q.answer || '';
  let options = (q as any).options;

  // Detect malformed choice questions masquerading as sql/short
  if (type === 'sql' || type === 'short') {
    if (question.includes('A、') && question.includes('B、') && question.includes('C、') && question.includes('D、') && question.includes('正确答案:')) {
      type = 'choice';
      // Match A、 B、 C、 D、 and 正确答案:
      const match = question.match(/(.*?)A、(.*?)B、(.*?)C、(.*?)D、(.*?)正确答案:\s*([A-D])/);
      if (match) {
        question = match[1].trim();
        options = [
          { label: 'A', text: match[2].trim() },
          { label: 'B', text: match[3].trim() },
          { label: 'C', text: match[4].trim() },
          { label: 'D', text: match[5].trim() }
        ];
        answer = match[6];
      }
    } else if (question.includes('正确答案:')) {
      const match = question.match(/(.*?)正确答案:\s*(.*)/);
      if (match) {
        question = match[1].trim();
        answer = match[2].trim();
        if (answer === '正确' || answer === '错误' || answer === 'T' || answer === 'F' || answer === '√' || answer === '×') {
          type = 'tf';
          options = [
            { label: 'A', text: '正确' },
            { label: 'B', text: '错误' }
          ];
          answer = ['正确', 'T', '√'].includes(answer) ? 'A' : 'B';
        } else {
          type = 'short';
        }
      }
    }
  }

  return {
    ...q,
    type,
    question,
    answer,
    options,
    chapter: (q as any).chapter || '未分类'
  };
}) as Question[];

interface Option {
  label: string;
  text: string;
}

interface Question {
  id: number;
  type: 'choice' | 'tf' | 'short' | 'sql';
  question: string;
  options?: Option[];
  answer: string;
  difficulty?: string;
  chapter: string;
  conceptKeys?: string[];
  explanation?: string;
  image?: string;
}

interface MindMapNodeData {
  name: string;
  description?: string;
  children?: MindMapNodeData[];
}

const mindmapRoot = mindmapDataRaw as MindMapNodeData;

// Simple, elegant text highlighter (no ugly backgrounds)
const RichText = ({ text }: { text: string }) => {
  if (!text) return null;
  const keywords = [
    '数据库系统', '数据库管理系统', 'DBMS', 'DBS', '数据库', '数据模型', '外模式', '内模式', '概念模式',
    '关系代数', '笛卡尔积', '自然连接', '投影', '选择',
    '主键', '外键', '参照完整性', '实体完整性', '用户定义完整性',
    '1NF', '2NF', '3NF', 'BCNF', '第一范式', '第二范式', '第三范式', '部分函数依赖', '传递函数依赖',
    'E-R图', '实体', '属性', '联系', '需求分析', '逻辑结构设计',
    'ACID', '原子性', '一致性', '隔离性', '持久性', '事务', '并发操作',
    '脏读', '不可重复读', '幻读', '排他锁', '共享锁', 'X锁', 'S锁', '封锁协议',
    '死锁', '两段锁协议'
  ];
  keywords.sort((a, b) => b.length - a.length);
  
  // Also parse **markdown** just in case the JSON data contains it
  const boldRegex = /(\*\*.*?\*\*)/g;
  let blocks = text.split(boldRegex);

  return (
    <>
      {blocks.map((block, idx) => {
        if (block.startsWith('**') && block.endsWith('**')) {
          return <strong key={idx} style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{block.slice(2, -2)}</strong>;
        }

        const regex = new RegExp(`(${keywords.join('|')})`, 'g');
        const parts = block.split(regex);
        return parts.map((part, i) => {
          if (keywords.includes(part)) {
            // Apply a nice bold blue color to important concepts
            return <strong key={`${idx}-${i}`} style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{part}</strong>;
          }
          return <span key={`${idx}-${i}`}>{part}</span>;
        });
      })}
    </>
  );
}

// Recursive Component for Mind Map Node
const MindMapNode = ({ node, level = 0 }: { node: MindMapNodeData, level?: number }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;
  const hasDesc = !!node.description;
  const isExpandable = hasChildren || hasDesc;

  return (
    <div className={`mindmap-node level-${Math.min(level, 2)} ${hasChildren && expanded ? 'has-children' : ''}`}>
      <div className="node-content" onClick={() => isExpandable && setExpanded(!expanded)}>
        <div className="node-title">
          {node.name}
          {isExpandable && (
            <span style={{color: 'var(--text-muted)', opacity: 0.8, display: 'flex', alignItems: 'center'}}>
              {expanded ? <ChevronDown size={18}/> : <IconRight size={18}/>}
            </span>
          )}
        </div>
        {hasDesc && expanded && (
          <div className="node-desc">
            <RichText text={node.description!} />
          </div>
        )}
      </div>
      
      {hasChildren && expanded && (
        <div className="mindmap-children">
          {node.children!.map((child, idx) => (
            <MindMapNode key={idx} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<'practice' | 'concept'>('concept')
  const [filterType, setFilterType] = useState<'all' | 'choice' | 'tf' | 'short' | 'sql'>('all')
  const [filterChapter, setFilterChapter] = useState<string>('all')

  const chapters = useMemo(() => {
    return [
      "第一章 绪论与基础",
      "第二章 关系数据库",
      "第三章 SQL语言",
      "第四章 数据库安全性",
      "第五章 关系数据理论",
      "第六章 关系系统及其查询优化",
      "第七章 数据库设计",
      "第八章 数据库编程",
      "第九章 关系查询处理",
      "第十章 事务与并发控制"
    ];
  }, [])

  // For concept mode, we can show specific chapters or all
  const currentMindMapData = useMemo(() => {
    if (filterChapter === 'all') return mindmapRoot;
    
    // Match the exact chapter number, e.g., "第七章"
    const chapterMatch = filterChapter.match(/第[一二三四五六七八九十]+章/);
    if (chapterMatch) {
      const chapterPrefix = chapterMatch[0];
      const chapterNode = mindmapRoot.children?.find(c => c.name.includes(chapterPrefix));
      if (chapterNode) return chapterNode;
    }
    
    // Fallback if not found in JSON
    return {
      name: filterChapter,
      description: "思维导图中暂未收录本章的详细内容。",
      children: []
    } as MindMapNodeData;
  }, [filterChapter])

  const filteredQuestions = useMemo(() => {
    return questionsData.filter(q => {
      const matchType = filterType === 'all' || q.type === filterType;
      // Also match by prefix to be safe
      const chapterPrefixMatch = filterChapter.match(/第[一二三四五六七八九十]+章/);
      const prefix = chapterPrefixMatch ? chapterPrefixMatch[0] : filterChapter;
      
      const matchChapter = filterChapter === 'all' || q.chapter.includes(prefix);
      return matchType && matchChapter;
    })
  }, [filterType, filterChapter])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [textAnswer, setTextAnswer] = useState("")
  const [showAnswer, setShowAnswer] = useState(false)
  const [isRandomMode, setIsRandomMode] = useState(false)
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([])
  
  useEffect(() => {
    if (isRandomMode) {
        const indices = Array.from({length: filteredQuestions.length}, (_, i) => i);
        indices.sort(() => Math.random() - 0.5);
        setShuffledIndices(indices);
    } else {
        setShuffledIndices([]);
    }
    setCurrentIndex(0);
  }, [isRandomMode, filteredQuestions.length]);

  const currentQuestion = useMemo(() => {
      const idx = isRandomMode && shuffledIndices.length > 0 ? shuffledIndices[currentIndex] : currentIndex;
      return filteredQuestions[idx] || null;
  }, [currentIndex, filteredQuestions, isRandomMode, shuffledIndices]);
  
  const currentOptions = useMemo(() => {
    if (!currentQuestion?.options) return [];
    return currentQuestion.options;
  }, [currentQuestion]);

  const isAnswered = selectedOption !== null || showAnswer

  const checkIsCorrect = (label: string, question: Question | null) => {
    if (!question) return false;
    if (label === question.answer) return true;
    if (question.type === 'tf' && question.options) {
      const optText = question.options.find(o => o.label === label)?.text;
      if (optText && question.answer.startsWith(optText)) return true;
      if (optText === '正确' && ['T', '√', '正确'].includes(question.answer)) return true;
      if (optText === '错误' && ['F', '×', '错误'].includes(question.answer)) return true;
    }
    return false;
  }

  useEffect(() => {
    const el = document.getElementById('main-scroll-area')
    if(el) el.scrollTo(0, 0)
    setSelectedOption(null)
    setShowAnswer(false)
    setTextAnswer("")
  }, [currentIndex, filterType, filterChapter, activeTab])

  const handleOptionClick = (label: string) => {
    if (isAnswered) return
    setSelectedOption(label)
  }

  const handleRevealAnswer = () => {
    setShowAnswer(true)
  }

  const handleNext = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedOption(null)
      setTextAnswer("")
      setShowAnswer(false)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedOption(null)
      setTextAnswer("")
      setShowAnswer(false)
    }
  }

  const relevantConcepts = useMemo(() => {
    if (!currentQuestion) return []
    
    // First try to use the exact conceptKeys explicitly assigned to the question
    if (currentQuestion.conceptKeys && currentQuestion.conceptKeys.length > 0) {
      return currentQuestion.conceptKeys
        .map(key => dictionaryData.find(d => d.keyword === key))
        .filter(Boolean) as typeof dictionaryData;
    }

    // Fallback: naive keyword matching if conceptKeys is missing
    let fullText = currentQuestion.question + " " + currentQuestion.answer
    if (currentQuestion.options) {
      fullText += " " + currentQuestion.options.map(o => o.text).join(" ")
    }
    return dictionaryData.filter(concept => fullText.includes(concept.keyword))
  }, [currentQuestion])

  return (
    <div className="dashboard">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <Database size={26} /> DB 通关系统
        </div>

        <div className="nav-section">
          <div className="nav-title">系统模块</div>
          <button 
            className={`nav-item ${activeTab === 'practice' ? 'active' : ''}`}
            onClick={() => setActiveTab('practice')}
          >
            <Edit3 size={20}/> 刷题实战库
          </button>
          <button 
            className={`nav-item ${activeTab === 'concept' ? 'active' : ''}`}
            onClick={() => setActiveTab('concept')}
          >
            <Network size={20}/> 全景思维导图
          </button>
        </div>

        <div className="nav-section">
          <div className="nav-title">章节导航</div>
          <button 
            className={`nav-item chapter-item ${filterChapter === 'all' ? 'active' : ''}`}
            onClick={() => setFilterChapter('all')}
          >
            <LayoutDashboard size={18}/> {activeTab === 'concept' ? '全书综合脉络' : '全书题库综合'}
          </button>
          {chapters.map(chap => (
            <button 
              key={chap}
              className={`nav-item chapter-item ${filterChapter === chap ? 'active' : ''}`}
              onClick={() => setFilterChapter(chap)}
            >
              <div style={{width: 6, height: 6, borderRadius: '50%', background: filterChapter === chap ? 'var(--accent-primary)' : 'var(--text-muted)'}}></div>
              {chap}
            </button>
          ))}
        </div>

        {activeTab === 'practice' && (
          <>
            <div className="nav-section">
              <div className="nav-title">题型筛选</div>
              <div className="pills-container">
                <span className={`pill ${filterType === 'all' ? 'active' : ''}`} onClick={() => setFilterType('all')}>全部</span>
                <span className={`pill ${filterType === 'choice' ? 'active' : ''}`} onClick={() => setFilterType('choice')}>选择题</span>
                <span className={`pill ${filterType === 'tf' ? 'active' : ''}`} onClick={() => setFilterType('tf')}>判断题</span>
                <span className={`pill ${filterType === 'short' ? 'active' : ''}`} onClick={() => setFilterType('short')}>简答题</span>
                <span className={`pill ${filterType === 'sql' ? 'active' : ''}`} onClick={() => setFilterType('sql')}>实训题</span>
              </div>
            </div>
          </>
        )}
        
        {activeTab === 'concept' && (
          <div style={{marginTop: 'auto', padding: '1.5rem', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5}}>
            <Lightbulb size={16} style={{display: 'inline', marginBottom: '-3px'}}/> 提示：您可以点击左侧的章节，单独查看该章节的思维导图。点击导图节点可展开/折叠知识点。
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="main-wrapper" id="main-scroll-area">
        <div className="main-container">
          
          {activeTab === 'concept' && (
            <div style={{width: '100%', display: 'flex', flexDirection: 'column'}}>
              <h1 style={{fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)'}}>
                {filterChapter === 'all' ? '全景思维导图' : `${filterChapter} 导图`}
              </h1>
              <p style={{color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1.1rem'}}>
                将知识点结构化呈现。节点可展开或收起，蓝色的字体是<strong style={{color:'var(--accent-primary)'}}>核心考点</strong>。
              </p>
              
              <div className="mindmap-container">
                <MindMapNode node={currentMindMapData} />
              </div>
            </div>
          )}

          {activeTab === 'practice' && (
            <>
              {!currentQuestion ? (
                <div className="card" style={{textAlign: 'center', padding: '6rem 2rem', maxWidth: '800px', margin: '0 auto'}}>
                  <ShieldAlert size={64} color="var(--text-muted)" style={{margin: '0 auto 1.5rem'}}/>
                  <h2 style={{color: 'var(--text-primary)', marginBottom: '1rem', fontSize: '1.5rem'}}>当前章节无题目</h2>
                  <p style={{color: 'var(--text-muted)', fontSize: '1.1rem'}}>当前题库中暂未收录该章节的题目，请在左侧切换到其他章节继续复习。</p>
                </div>
              ) : (
                <div className={`content-grid ${isAnswered ? 'has-learning' : ''}`}>
                  {/* Question Column */}
                  <div className="card">
                    <div className="main-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Database size={24} style={{ color: 'var(--accent-primary)' }} />
                        {filterChapter === 'all' ? '所有题目' : filterChapter}
                      </h2>
                      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <label style={{ 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', 
                          fontSize: '0.9rem', color: isRandomMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          background: isRandomMode ? 'var(--bg-app)' : 'transparent',
                          padding: '0.4rem 0.8rem', borderRadius: '2rem', border: `1px solid ${isRandomMode ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                          transition: 'all 0.2s'
                        }}>
                          <input 
                            type="checkbox" 
                            checked={isRandomMode} 
                            onChange={(e) => setIsRandomMode(e.target.checked)} 
                            style={{ display: 'none' }}
                          />
                          <Shuffle size={16} />
                          {isRandomMode ? '乱序模式: 开' : '乱序模式: 关'}
                        </label>
                        <div className="progress-text" style={{ fontWeight: 500, color: 'var(--accent-primary)', background: 'var(--bg-app)', padding: '0.5rem 1rem', borderRadius: '2rem', border: '1px solid var(--border-color)' }}>
                          进度: {currentIndex + 1} / {filteredQuestions.length}
                        </div>
                      </div>
                    </div>
                    
                    <div className="question-meta">
                      <span className="badge">
                        {currentQuestion.type === 'choice' && '选择题'}
                        {currentQuestion.type === 'tf' && '判断题'}
                        {currentQuestion.type === 'short' && '简答题'}
                        {currentQuestion.type === 'sql' && '实训题(SQL)'}
                      </span>
                    </div>
                    
                    <h2 className="question-text">{renderLatexText(currentQuestion.question)}</h2>
                    {currentQuestion.image && (
                      <div style={{ margin: '1rem 0', padding: '1rem', background: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                        <img src={currentQuestion.image} alt="题目附图" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain' }} />
                      </div>
                    )}
                    
                    {/* Options */}
                    {(currentQuestion.type === 'choice' || currentQuestion.type === 'tf') && (
                      <div className="options-list" style={{ marginBottom: '1.5rem' }}>
                        {currentOptions.map((opt) => {
                          let btnClass = "option-btn"
                          const isCorrectOption = checkIsCorrect(opt.label, currentQuestion)
                          const isSelectedOption = opt.label === selectedOption

                          if (isAnswered) {
                            if (isCorrectOption) btnClass += " correct"
                            else if (isSelectedOption) btnClass += " incorrect"
                          }

                          return (
                            <button 
                              key={opt.label}
                              className={btnClass}
                              onClick={() => handleOptionClick(opt.label)}
                              disabled={isAnswered}
                            >
                              <span className="option-label">{opt.label}</span>
                              <span style={{flex: 1}}>{renderLatexText(opt.text)}</span>
                              {isAnswered && isCorrectOption && (
                                <CheckCircle2 size={24} />
                              )}
                              {isAnswered && isSelectedOption && !isCorrectOption && (
                                <XCircle size={24} />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* Direct Reveal Button for Choice/TF */}
                    {(currentQuestion.type === 'choice' || currentQuestion.type === 'tf') && !isAnswered && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
                        <button 
                          onClick={handleRevealAnswer} 
                          style={{
                            background: 'none', border: 'none', color: 'var(--text-secondary)', 
                            fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem',
                            padding: '0.5rem', opacity: 0.7, transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent-primary)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                        >
                          <Lightbulb size={14} /> 直接看解析
                        </button>
                      </div>
                    )}

                    {/* Text Area for Short / SQL */}
                    {(currentQuestion.type === 'short' || currentQuestion.type === 'sql') && (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                        {!showAnswer ? (
                          <>
                            <textarea 
                              className="styled-textarea" 
                              placeholder={currentQuestion.type === 'sql' ? "编写 SQL 语句...\n\n例如：\nSELECT * FROM students WHERE age > 20;" : "输入你的解答...\n\n写下你的思路，与标准答案对比才能印象深刻。"}
                              value={textAnswer}
                              onChange={(e) => setTextAnswer(e.target.value)}
                            />
                            <button className="btn btn-outline" onClick={handleRevealAnswer} style={{alignSelf: 'flex-start'}}>
                              提交对比标准答案
                            </button>
                          </>
                        ) : (
                          <div className="reference-answer">
                            <h3 style={{color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems:'center', gap:'0.75rem', fontSize: '1.2rem'}}>
                              <CheckCircle2 size={22}/> 官方参考答案
                            </h3>
                            <div className={currentQuestion.type === 'sql' ? 'sql-code-block' : 'text-answer-block'}>
                              {currentQuestion.answer}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="card-footer" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid var(--border-color)' }}>
                      <button 
                        className="btn-secondary" 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                          fontWeight: 500, fontSize: '0.95rem',
                          background: 'var(--bg-app)', color: 'var(--text-secondary)',
                          border: '1px solid var(--border-light)', 
                          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                          opacity: currentIndex === 0 ? 0.5 : 1,
                          transition: 'all 0.2s'
                        }}
                      >
                        <ChevronLeft size={18} /> 返回上一题
                      </button>
                      <button 
                        className="btn-primary" 
                        onClick={handleNext}
                        disabled={currentIndex >= filteredQuestions.length - 1}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.75rem 1.5rem', borderRadius: '0.5rem',
                          fontWeight: 500, fontSize: '0.95rem',
                          opacity: currentIndex >= filteredQuestions.length - 1 ? 0.5 : 1,
                          cursor: currentIndex >= filteredQuestions.length - 1 ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {isAnswered ? '继续下一题' : '跳过本题'} <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Learning Panel Column */}
                  {isAnswered && (
                    <div className="learning-panel" style={{position: 'sticky', top: '3rem'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '1.3rem'}}>
                        <Lightbulb size={24} /> 知识点拆解与解析
                      </div>
                      
                      {currentQuestion.explanation && (
                        <div className="concept-hint-card" style={{ borderLeft: '4px solid var(--accent-primary)', background: 'var(--accent-light)' }}>
                          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>题目深度解析</h3>
                          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}><RichText text={currentQuestion.explanation} /></p>
                        </div>
                      )}

                      {relevantConcepts.length > 0 && (
                        <div style={{display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: currentQuestion.explanation ? '1.5rem' : '0'}}>
                          {currentQuestion.explanation && (
                             <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '-0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>核心概念速查</div>
                          )}
                          {relevantConcepts.map((concept, idx) => (
                            <div key={idx} className="concept-hint-card">
                              <h3>{concept.keyword}</h3>
                              <p><RichText text={concept.description} /></p>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {relevantConcepts.length === 0 && !currentQuestion.explanation && (
                        <div className="concept-hint-card">
                          <h3>{currentQuestion.chapter}</h3>
                          <p>这是一道综合应用题。想要巩固此章节，你可以点击左侧栏的“全景思维导图”进行系统性学习。</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AIChatWindow currentQuestion={currentQuestion} />
    </div>
  )
}

export default App
