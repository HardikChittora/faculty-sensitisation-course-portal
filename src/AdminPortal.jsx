import React, { useState, useEffect } from 'react';
import { 
  Award, BookOpen, CheckCircle, Clock, AlertCircle, Search, 
  Eye, Save, Plus, Trash2, RotateCcw, 
  LogOut, UserCheck, Play, RefreshCw
} from 'lucide-react';
import { 
  fetchCourseData, updateModuleContent, fetchAdminAnalytics, 
  fetchFacultyRecords, fetchFacultyAttempts, resetAllDataToDefaults 
} from './services/api';

export default function AdminPortal({ user, onLogout, onPreviewFaculty }) {
  const [activeTab, setActiveTab] = useState('completions'); // 'completions' | 'content'
  const [analytics, setAnalytics] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'in-progress'

  // Attempt Drilldown Modal State
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [facultyAttempts, setFacultyAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);

  // Course Content Management State
  const [courseData, setCourseData] = useState(null);
  const [selectedModNum, setSelectedModNum] = useState(1);
  const [editingModule, setEditingModule] = useState(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [saving, setSaving] = useState(false);

  // Load Data
  const loadPortalData = async () => {
    try {
      const [analyticsData, facultyData, course] = await Promise.all([
        fetchAdminAnalytics(),
        fetchFacultyRecords(),
        fetchCourseData()
      ]);
      setAnalytics(analyticsData);
      setFacultyList(facultyData);
      setCourseData(course);
      if (course && course.modules && course.modules[selectedModNum]) {
        setEditingModule(JSON.parse(JSON.stringify(course.modules[selectedModNum])));
      }
    } catch (err) {
      console.error('Failed to load admin portal data:', err);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, []);

  // Sync editing module when module selector changes
  useEffect(() => {
    if (courseData?.modules?.[selectedModNum]) {
      setEditingModule(JSON.parse(JSON.stringify(courseData.modules[selectedModNum])));
    }
  }, [selectedModNum, courseData]);

  // Open User Attempts Modal
  const handleOpenAttempts = async (faculty) => {
    setSelectedFaculty(faculty);
    setLoadingAttempts(true);
    try {
      const attempts = await fetchFacultyAttempts(faculty.id);
      setFacultyAttempts(attempts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttempts(false);
    }
  };

  // Content Management: Save Module
  const handleSaveModule = async () => {
    if (!editingModule) return;
    setSaving(true);
    try {
      await updateModuleContent('c1', selectedModNum, editingModule);
      setSaveSuccessMessage(`Module ${selectedModNum} contents and quiz updated successfully!`);
      // Reload fresh course data
      const updatedCourse = await fetchCourseData();
      setCourseData(updatedCourse);
      setTimeout(() => setSaveSuccessMessage(''), 4000);
    } catch (err) {
      alert('Failed to save module: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Content Management: Quiz Question Handlers
  const handleQuestionTextChange = (qIdx, text) => {
    setEditingModule(prev => {
      const updatedQuiz = [...prev.quiz];
      updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], question: text };
      return { ...prev, quiz: updatedQuiz };
    });
  };

  const handleOptionTextChange = (qIdx, oIdx, text) => {
    setEditingModule(prev => {
      const updatedQuiz = [...prev.quiz];
      const updatedOptions = [...updatedQuiz[qIdx].options];
      updatedOptions[oIdx] = text;
      updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], options: updatedOptions };
      return { ...prev, quiz: updatedQuiz };
    });
  };

  const handleCorrectOptionChange = (qIdx, oIdx) => {
    setEditingModule(prev => {
      const updatedQuiz = [...prev.quiz];
      updatedQuiz[qIdx] = { ...updatedQuiz[qIdx], correct: oIdx };
      return { ...prev, quiz: updatedQuiz };
    });
  };

  const handleAddQuestion = () => {
    setEditingModule(prev => {
      const newQuestion = {
        question: "New assessment question prompt?",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correct: 0
      };
      return { ...prev, quiz: [...(prev.quiz || []), newQuestion] };
    });
  };

  const handleDeleteQuestion = (qIdx) => {
    if (editingModule.quiz.length <= 1) {
      alert('A module assessment must contain at least one question.');
      return;
    }
    setEditingModule(prev => ({
      ...prev,
      quiz: prev.quiz.filter((_, idx) => idx !== qIdx)
    }));
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset all course content, quiz questions, and faculty attempt logs to default state?')) {
      await resetAllDataToDefaults();
      await loadPortalData();
      alert('System reset to default state complete.');
    }
  };

  // Filter faculty records
  const filteredFaculty = facultyList.filter(faculty => {
    const matchesSearch = 
      faculty.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faculty.department.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'completed') return faculty.isCompleted;
    if (statusFilter === 'in-progress') return !faculty.isCompleted && faculty.completedModulesCount > 0;
    return true;
  });

  return (
    <div className="admin-container">
      {/* Top Institute Admin Header */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <div className="admin-badge-icon">
            <Award size={24} color="#ffffff" />
          </div>
          <div>
            <h2 className="admin-title">Faculty Sensitisation Portal</h2>
            <div className="admin-subtitle">Institute Administrator Control Panel</div>
          </div>
        </div>

        <div className="admin-header-actions">
          <button 
            className="btn btn-outline" 
            onClick={onPreviewFaculty}
            title="Jump to faculty course player view"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc' }}
          >
            <Eye size={16} /> Preview as Faculty
          </button>
          
          <div className="admin-user-pill">
            <div className="admin-avatar">AD</div>
            <div className="admin-user-info">
              <span className="admin-name">{user?.name || 'Administrator'}</span>
              <span className="admin-role">Academic Office</span>
            </div>
          </div>

          <button className="btn btn-outline btn-logout" onClick={onLogout} title="Sign out of Admin Portal">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Tabs Navigation */}
      <div className="admin-nav-bar">
        <div className="admin-tabs">
          <button 
            className={`admin-tab-btn ${activeTab === 'completions' ? 'active' : ''}`}
            onClick={() => setActiveTab('completions')}
          >
            <UserCheck size={18} />
            Faculty Completions & Attempts Analytics
          </button>
          <button 
            className={`admin-tab-btn ${activeTab === 'content' ? 'active' : ''}`}
            onClick={() => setActiveTab('content')}
          >
            <BookOpen size={18} />
            Course Content & Quiz Management
          </button>
        </div>

        <div className="admin-nav-extra">
          <button className="btn btn-outline" onClick={loadPortalData} title="Refresh data">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Main Content View */}
      <main className="admin-main">
        {/* ================= TAB 1: COMPLETIONS & ANALYTICS ================= */}
        {activeTab === 'completions' && (
          <div className="analytics-section">
            {/* KPI Cards Row */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
                  <UserCheck size={24} />
                </div>
                <div>
                  <div className="kpi-value">{analytics?.totalEnrolled || 0}</div>
                  <div className="kpi-label">Total Faculty Enrolled</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                  <Award size={24} />
                </div>
                <div>
                  <div className="kpi-value">
                    {analytics?.completedCount || 0}
                    <span className="kpi-badge-success">{analytics?.completionRate || 0}% Completed</span>
                  </div>
                  <div className="kpi-label">Course Certified Faculty</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#fefce8', color: '#ca8a04' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <div className="kpi-value">{analytics?.inProgressCount || 0}</div>
                  <div className="kpi-label">In Progress (Active Modules)</div>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
                  <RotateCcw size={24} />
                </div>
                <div>
                  <div className="kpi-value">{analytics?.avgAttempts || 0}</div>
                  <div className="kpi-label">Avg. Attempts to Pass</div>
                </div>
              </div>
            </div>

            {/* Table & Filters Card */}
            <div className="admin-card">
              <div className="card-header-flex">
                <div>
                  <h3 className="card-title">Faculty Completion Status & Assessment Records</h3>
                  <p className="card-subtitle">
                    Real-time monitoring of faculty progress, passing rates, and attempt logs across all modules.
                  </p>
                </div>
                
                {/* Search & Filter controls */}
                <div className="table-controls">
                  <div className="search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Search faculty, email, or dept..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="filter-pill-group">
                    <button 
                      className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All ({facultyList.length})
                    </button>
                    <button 
                      className={`filter-pill ${statusFilter === 'completed' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('completed')}
                    >
                      Completed
                    </button>
                    <button 
                      className={`filter-pill ${statusFilter === 'in-progress' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('in-progress')}
                    >
                      In Progress
                    </button>
                  </div>
                </div>
              </div>

              {/* Faculty Table */}
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Faculty Member</th>
                      <th>Department</th>
                      <th>Modules Completed</th>
                      <th>Overall Progress</th>
                      <th>Total Assessment Attempts</th>
                      <th>Certification Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty.map(faculty => (
                      <tr key={faculty.id}>
                        <td>
                          <div className="faculty-cell">
                            <div className="faculty-avatar">
                              {faculty.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <div className="faculty-name">{faculty.name}</div>
                              <div className="faculty-email">{faculty.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="dept-tag">{faculty.department}</span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--text-main)' }}>
                            {faculty.completedModulesCount} / {faculty.totalModules}
                          </strong> Modules
                        </td>
                        <td style={{ minWidth: '160px' }}>
                          <div className="progress-bar-wrap">
                            <div className="progress-bar-bg">
                              <div 
                                className="progress-bar-fill" 
                                style={{ 
                                  width: `${faculty.progressPercent}%`,
                                  backgroundColor: faculty.isCompleted ? '#16a34a' : '#2563eb'
                                }}
                              />
                            </div>
                            <span className="progress-bar-pct">{faculty.progressPercent}%</span>
                          </div>
                        </td>
                        <td>
                          <div className="attempts-pill-badge">
                            <RotateCcw size={13} />
                            <span><strong>{faculty.totalAttempts}</strong> attempts</span>
                          </div>
                        </td>
                        <td>
                          {faculty.isCompleted ? (
                            <span className="status-badge status-completed">
                              <CheckCircle size={14} /> Certified Complete
                            </span>
                          ) : faculty.completedModulesCount > 0 ? (
                            <span className="status-badge status-progress">
                              <Clock size={14} /> In Progress
                            </span>
                          ) : (
                            <span className="status-badge status-notstarted">
                              Not Started
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn btn-outline btn-sm"
                            onClick={() => handleOpenAttempts(faculty)}
                            title="Inspect module-by-module assessment attempts and timestamps"
                          >
                            <Eye size={14} /> View Attempt History
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredFaculty.length === 0 && (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                          No faculty members match the selected filter or search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: COURSE CONTENT & QUIZ MANAGEMENT ================= */}
        {activeTab === 'content' && (
          <div className="content-manager-section">
            {saveSuccessMessage && (
              <div className="alert-success-banner">
                <CheckCircle size={20} />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            <div className="content-manager-grid">
              {/* Left Column: Module Navigation & Overview */}
              <div className="content-sidebar-col">
                <div className="admin-card">
                  <h4 className="card-title-sm">Course Modules</h4>
                  <p className="card-subtitle-sm">Select a module to edit its video lecture and assessment quiz.</p>

                  <div className="module-selector-list">
                    {[1, 2, 3].map(mNum => {
                      const mod = courseData?.modules?.[mNum];
                      const isSelected = selectedModNum === mNum;
                      return (
                        <div 
                          key={mNum} 
                          className={`module-select-item ${isSelected ? 'active' : ''}`}
                          onClick={() => setSelectedModNum(mNum)}
                        >
                          <div className="mod-select-header">
                            <span className="mod-num-tag">Module {mNum}</span>
                            <span className="mod-q-count">{mod?.quiz?.length || 0} Questions</span>
                          </div>
                          <div className="mod-select-title">{mod?.title || `Module ${mNum}`}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ width: '100%', fontSize: '12px', color: '#dc2626' }}
                      onClick={handleResetDefaults}
                    >
                      <RotateCcw size={14} /> Reset Course Data to Defaults
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Module Editor */}
              <div className="content-editor-col">
                {editingModule ? (
                  <div className="admin-card">
                    <div className="card-header-flex">
                      <div>
                        <span className="section-badge">Module {selectedModNum} Editor</span>
                        <h3 className="card-title" style={{ marginTop: '4px' }}>
                          Edit Video Lecture & Assessment Questions
                        </h3>
                      </div>

                      <button 
                        className="btn btn-primary" 
                        onClick={handleSaveModule} 
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                      >
                        <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>

                    {/* Section 1: Module Details & Video */}
                    <div className="editor-group-box">
                      <h4 className="editor-group-title">1. Lecture & Video Configuration</h4>
                      
                      <div className="input-group">
                        <label>Module Title</label>
                        <input 
                          type="text" 
                          value={editingModule.title} 
                          onChange={(e) => setEditingModule({ ...editingModule, title: e.target.value })}
                        />
                      </div>

                      <div className="input-group">
                        <label>Module Description / Learning Outcomes</label>
                        <textarea 
                          rows={3}
                          value={editingModule.description} 
                          onChange={(e) => setEditingModule({ ...editingModule, description: e.target.value })}
                          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', fontFamily: 'inherit' }}
                        />
                      </div>

                      <div className="form-row">
                        <div className="input-group" style={{ flex: 1 }}>
                          <label>YouTube Video ID or Key</label>
                          <input 
                            type="text" 
                            value={editingModule.videoId} 
                            onChange={(e) => setEditingModule({ ...editingModule, videoId: e.target.value })}
                            placeholder="e.g. jNQXAC9IVRw"
                          />
                          <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                            Enter the 11-character YouTube video ID from the lecture URL.
                          </small>
                        </div>

                        <div className="input-group" style={{ width: '200px' }}>
                          <label>Passing Threshold</label>
                          <select 
                            value={editingModule.passingThreshold || 80}
                            onChange={(e) => setEditingModule({ ...editingModule, passingThreshold: Number(e.target.value) })}
                            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
                          >
                            <option value={60}>60% Passing</option>
                            <option value={75}>75% Passing</option>
                            <option value={80}>80% Passing (Recommended)</option>
                            <option value={100}>100% Perfect Score</option>
                          </select>
                        </div>
                      </div>

                      {/* Video Preview Pill */}
                      <div className="video-preview-box">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: '500', fontSize: '13px' }}>
                          <Play size={15} color="var(--primary)" /> Video Lecture Preview
                        </div>
                        <div style={{ maxWidth: '480px', aspectRatio: '16/9', background: '#000', borderRadius: '4px', overflow: 'hidden' }}>
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${editingModule.videoId}`}
                            title="Video Preview"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Assessment / Quiz Questions Editor */}
                    <div className="editor-group-box" style={{ marginTop: '32px' }}>
                      <div className="card-header-flex" style={{ marginBottom: '16px' }}>
                        <div>
                          <h4 className="editor-group-title" style={{ margin: 0 }}>
                            2. Mandatory Assessment Questions ({editingModule.quiz?.length || 0})
                          </h4>
                          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                            Faculty must achieve at least {editingModule.passingThreshold || 80}% on these questions to unlock the next module.
                          </p>
                        </div>

                        <button 
                          className="btn btn-outline btn-sm" 
                          onClick={handleAddQuestion}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={15} /> Add Question
                        </button>
                      </div>

                      <div className="questions-editor-list">
                        {editingModule.quiz?.map((q, qIdx) => (
                          <div key={qIdx} className="question-edit-card">
                            <div className="q-card-header">
                              <span className="q-card-badge">Question {qIdx + 1}</span>
                              <button 
                                className="btn-icon-danger" 
                                onClick={() => handleDeleteQuestion(qIdx)}
                                title="Remove question"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="input-group" style={{ marginBottom: '16px' }}>
                              <label style={{ fontSize: '13px' }}>Question Prompt</label>
                              <input 
                                type="text" 
                                value={q.question} 
                                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                                style={{ fontWeight: '500' }}
                              />
                            </div>

                            <div className="options-editor-block">
                              <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                                Answer Options (Select the radio button next to the CORRECT answer):
                              </label>

                              {q.options.map((opt, oIdx) => {
                                const isCorrect = q.correct === oIdx;
                                return (
                                  <div key={oIdx} className={`opt-edit-row ${isCorrect ? 'opt-correct' : ''}`}>
                                    <input 
                                      type="radio" 
                                      name={`correct-radio-${qIdx}`}
                                      checked={isCorrect}
                                      onChange={() => handleCorrectOptionChange(qIdx, oIdx)}
                                      title="Mark this option as the correct answer"
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <span className="opt-letter">{String.fromCharCode(65 + oIdx)}.</span>
                                    <input 
                                      type="text" 
                                      value={opt} 
                                      onChange={(e) => handleOptionTextChange(qIdx, oIdx, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + oIdx)} text`}
                                      className="opt-text-input"
                                    />
                                    {isCorrect && <span className="correct-tag">Correct Answer</span>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Save Action */}
                    <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-primary" 
                        onClick={handleSaveModule} 
                        disabled={saving}
                        style={{ padding: '12px 28px', fontSize: '15px' }}
                      >
                        <Save size={18} /> {saving ? 'Saving...' : 'Save All Module Changes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="admin-card" style={{ textAlign: 'center', padding: '60px' }}>
                    Select a module on the left to edit its content.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= ATTEMPTS DRILLDOWN MODAL ================= */}
      {selectedFaculty && (
        <div className="modal-overlay" onClick={() => setSelectedFaculty(null)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-flex">
              <div>
                <h2>Assessment Attempts & Progress History</h2>
                <div className="modal-user-subtitle">
                  <strong>{selectedFaculty.name}</strong> &bull; {selectedFaculty.email} &bull; {selectedFaculty.department}
                </div>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setSelectedFaculty(null)}>
                Close
              </button>
            </div>

            {loadingAttempts ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>Loading attempt records...</div>
            ) : (
              <div style={{ marginTop: '24px' }}>
                <div className="modal-metrics-strip">
                  <div className="m-metric">
                    <span className="m-val">{selectedFaculty.completedModulesCount} / {selectedFaculty.totalModules}</span>
                    <span className="m-lbl">Modules Completed</span>
                  </div>
                  <div className="m-metric">
                    <span className="m-val">{facultyAttempts.length}</span>
                    <span className="m-lbl">Total Attempts Recorded</span>
                  </div>
                  <div className="m-metric">
                    <span className="m-val" style={{ color: selectedFaculty.isCompleted ? '#16a34a' : '#ca8a04' }}>
                      {selectedFaculty.isCompleted ? 'Certified Complete' : 'In Progress'}
                    </span>
                    <span className="m-lbl">Status</span>
                  </div>
                </div>

                <h4 style={{ margin: '24px 0 12px 0', fontSize: '16px' }}>Detailed Attempts Timeline</h4>
                {facultyAttempts.length > 0 ? (
                  <div className="attempts-timeline-list">
                    {facultyAttempts.map((att, idx) => (
                      <div key={att.id || idx} className={`attempt-log-card ${att.passed ? 'att-passed' : 'att-failed'}`}>
                        <div className="att-header">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="att-badge">Module {att.moduleNum}</span>
                            <strong style={{ fontSize: '15px' }}>Attempt #{att.attemptNumber}</strong>
                          </div>
                          <span className="att-date">
                            {new Date(att.timestamp).toLocaleString(undefined, { 
                              year: 'numeric', month: 'short', day: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </span>
                        </div>

                        <div className="att-body">
                          <div className="att-score-block">
                            Score: <strong>{att.score} / {att.totalQuestions}</strong> ({att.percentage}%)
                          </div>
                          
                          <div>
                            {att.passed ? (
                              <span className="status-badge status-completed">
                                <CheckCircle size={14} /> Passed (Requirements Met)
                              </span>
                            ) : (
                              <span className="status-badge status-failed">
                                <AlertCircle size={14} /> Failed (Required Video Re-watch)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '4px', color: 'var(--text-muted)' }}>
                    No quiz attempts recorded yet for this faculty member.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
