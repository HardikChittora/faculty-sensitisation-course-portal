import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, LogOut, ArrowLeft, 
  ChevronDown, ChevronRight, PlayCircle, FileText, Award, AlertCircle
} from 'lucide-react';
import CoursePlayer from './CoursePlayer';
import { 
  fetchCourseData, fetchUserProgress, updateUserProgressApi, 
  fetchCourseNote, saveCourseNote, submitQuery
} from './services/api';

export default function Dashboard({ user, onLogout, isPreviewMode = false }) {
  const [currentView, setCurrentView] = useState('browse'); // 'browse', 'completed', 'course'
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [expandedModules, setExpandedModules] = useState({ 1: true });
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  
  const [courseData, setCourseData] = useState(null);
  const [progress, setProgress] = useState({});

  // Notes & Queries State
  const [notesText, setNotesText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [queryText, setQueryText] = useState('');
  const [isSubmittingQuery, setIsSubmittingQuery] = useState(false);
  const [courseMainView, setCourseMainView] = useState('player'); // 'player', 'notes', 'queries'

  useEffect(() => {
    async function loadData() {
      const course = await fetchCourseData();
      setCourseData(course);
      
      let initialProgress = {};
      const totalMods = course.totalModules || Object.keys(course.modules || {}).length || 3;
      for (let i = 1; i <= totalMods; i++) {
        initialProgress[`${course.id || 'c1'}-m${i}`] = { 
          unlocked: i === 1, 
          passed: false, 
          videoWatched: false, 
          maxTimeWatched: 0 
        };
      }

      if (user?.id) {
        const userProg = await fetchUserProgress(user.id, course.id || 'c1');
        setProgress({ ...initialProgress, ...userProg });
        
        const note = await fetchCourseNote(user.id, course.id || 'c1');
        setNotesText(note);
      } else {
        setProgress(initialProgress);
      }
    }
    loadData();
  }, [user]);

  const handleSaveNote = async () => {
    if (!user?.id || !selectedCourse) return;
    setIsSavingNote(true);
    await saveCourseNote(user.id, selectedCourse.id, notesText);
    setIsSavingNote(false);
  };

  const handleSubmitQuery = async () => {
    if (!user?.id || !selectedCourse || !queryText.trim()) return;
    setIsSubmittingQuery(true);
    const success = await submitQuery(user.id, queryText, selectedCourse.id);
    setIsSubmittingQuery(false);
    if (success) {
      setQueryText('');
      alert('Your query has been submitted successfully.');
    } else {
      alert('Failed to submit query. Please try again later.');
    }
  };

  const coursesList = courseData ? [courseData] : [];

  const handleModuleClick = (courseId, modNum) => {
    const modKey = `${courseId}-m${modNum}`;
    if (progress[modKey]?.unlocked || modNum === 1) {
      setActiveModule({ courseId, modNum, modKey });
      setExpandedModules(prev => ({ ...prev, [modNum]: true }));
      setCourseMainView('player');
    }
  };

  const toggleModuleExpansion = (modNum, e) => {
    e.stopPropagation();
    setExpandedModules(prev => ({ ...prev, [modNum]: !prev[modNum] }));
  };

  const updateModuleProgress = async (modKey, updates) => {
    setProgress(prev => {
      const updated = { ...prev };
      updated[modKey] = { ...updated[modKey], ...updates };
      
      if (updates.passed) {
        const parts = modKey.split('-m');
        const nextModNum = parseInt(parts[1]) + 1;
        const nextModKey = `${parts[0]}-m${nextModNum}`;
        if (updated[nextModKey]) {
          updated[nextModKey].unlocked = true;
        }
      }
      return updated;
    });

    if (user?.id) {
      await updateUserProgressApi(user.id, modKey, updates);
    }
  };

  const isCourseCompleted = (courseId) => {
    const course = coursesList.find(c => c.id === courseId);
    if (!course) return false;
    for (let i = 1; i <= course.totalModules; i++) {
      if (!progress[`${courseId}-m${i}`]?.passed) return false;
    }
    return true;
  };

  const handleCourseStart = (course) => {
    setSelectedCourse(course);
    setCurrentView('course');
    
    let modToOpen = 1;
    for (let i = 1; i <= course.totalModules; i++) {
      const modData = progress[`${course.id}-m${i}`];
      if (modData?.unlocked && !modData?.passed) {
        modToOpen = i;
        break;
      }
    }
    setExpandedModules({ [modToOpen]: true });
    handleModuleClick(course.id, modToOpen);
  };

  const handleGoBack = () => {
    setCurrentView('browse');
    setSelectedCourse(null);
    setActiveModule(null);
    setCourseMainView('player');
  };

  // --- RENDER SIDEBAR ---
  const renderSidebar = () => {
    if (currentView === 'course' && selectedCourse) {
      return (
        <div className="sidebar">
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <button className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', width: '100%' }} onClick={handleGoBack}>
              <ArrowLeft size={16} /> Back to Dashboard
            </button>
          </div>
          
          <div className="profile-section" style={{ flexDirection: 'column', alignItems: 'flex-start', borderBottom: 'none' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--primary)' }}>{selectedCourse.title}</h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>{selectedCourse.totalModules} Modules</p>
          </div>

          <div className="nav-section" style={{ flex: 1, padding: '16px 16px 80px 16px', overflowY: 'auto' }}>
            {Object.keys(selectedCourse.modules || {}).map(Number).sort((a,b)=>a-b).map(modNum => {
              const modKey = `${selectedCourse.id}-m${modNum}`;
              const modData = progress[modKey] || { unlocked: modNum === 1, passed: false };
              const isExpanded = expandedModules[modNum];
              const isActiveMod = activeModule?.modKey === modKey && courseMainView === 'player';
              const isLocked = !modData.unlocked;

              return (
                <div key={modKey} style={{ marginBottom: '12px' }}>
                  <div 
                    onClick={() => !isLocked && handleModuleClick(selectedCourse.id, modNum)}
                    style={{ 
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                      padding: '12px', borderRadius: '8px',
                      background: isActiveMod ? '#f4f4f5' : (isLocked ? '#f8fafc' : '#ffffff'),
                      border: `1px solid ${isActiveMod ? 'var(--primary)' : 'var(--border-color)'}`,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      opacity: isLocked ? 0.6 : 1,
                      fontWeight: isActiveMod ? '600' : '500',
                      color: isActiveMod ? 'var(--primary)' : 'var(--text-main)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {modData.passed ? (
                        <CheckCircle size={18} color="var(--success)" />
                      ) : isLocked ? (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #cbd5e1' }} />
                      ) : (
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--primary)' }} />
                      )}
                      Module {modNum}
                    </div>
                    <div onClick={(e) => !isLocked && toggleModuleExpansion(modNum, e)} style={{ padding: '4px' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </div>
                  </div>

                  {isExpanded && !isLocked && (
                    <div style={{ padding: '8px 12px 8px 32px', borderLeft: '2px solid #e2e8f0', marginLeft: '20px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: modData.videoWatched ? 'var(--success)' : 'var(--text-muted)', marginBottom: '8px' }}>
                        <PlayCircle size={14} /> Video Lecture
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: modData.passed ? 'var(--success)' : 'var(--text-muted)' }}>
                        <FileText size={14} /> Assessment
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid var(--border-color)', margin: '16px 0', paddingTop: '16px' }}>
              {/* Course Notes button removed from here */}
              <div 
                className={`nav-item ${courseMainView === 'queries' ? 'active' : ''}`}
                onClick={() => setCourseMainView('queries')}
                style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', background: courseMainView === 'queries' ? '#f4f4f5' : 'transparent', color: courseMainView === 'queries' ? 'var(--primary)' : 'var(--text-main)', fontWeight: courseMainView === 'queries' ? '600' : '500' }}
              >
                <AlertCircle size={18} /> Queries & Complaints
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Default Dashboard Sidebar
    return (
      <div className="sidebar">
        <div className="profile-section">
          <div className="profile-avatar">{user.name?.charAt(0) || 'U'}</div>
          <div className="profile-info">
            <h3>{user.name}</h3>
            <p>{user.department}</p>
          </div>
        </div>

        <div className="nav-section">
          <div 
            className={`nav-item ${currentView === 'browse' ? 'active' : ''}`}
            onClick={() => setCurrentView('browse')}
          >
            <BookOpen size={18} /> Browse Courses
          </div>
          
          <div 
            className={`nav-item ${currentView === 'completed' ? 'active' : ''}`}
            onClick={() => setCurrentView('completed')}
          >
            <Award size={18} /> Courses Completed
          </div>
        </div>

        <div style={{ flex: 1 }}></div>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }} onClick={onLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>
    );
  };

  // --- RENDER MAIN AREA ---
  const renderMainArea = () => {
    if (currentView === 'course-completed' && selectedCourse) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px' }}>
          <div style={{ background: '#f0fdf4', borderRadius: '16px', padding: '60px', border: '2px solid #bbf7d0', textAlign: 'center', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
            <Award size={80} color="#16a34a" style={{ margin: '0 auto 24px' }} />
            <h1 style={{ color: '#166534', margin: '0 0 16px', fontSize: '36px' }}>Congratulations!</h1>
            <p style={{ color: '#15803d', fontSize: '20px', marginBottom: '16px', fontWeight: '500' }}>
              You have successfully completed {selectedCourse.title}.
            </p>
            <p style={{ color: '#166534', marginBottom: '40px', fontSize: '16px', lineHeight: '1.6' }}>
              Thank you for dedicating your time to this important sensitization program. Your commitment helps foster a better academic environment at IIT Kharagpur. You can always review the materials from the 'Courses Completed' tab.
            </p>
            <button className="btn btn-primary" onClick={handleGoBack} style={{ padding: '16px 32px', fontSize: '18px' }}>
              Return to Dashboard
            </button>
          </div>
        </div>
      );
    }

    if (currentView === 'course' && selectedCourse) {
      if (courseMainView === 'notes') {
        return (
          <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ marginBottom: '8px' }}>Course Notes</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Write your personal notes for {selectedCourse.title}. They will be saved securely to your profile.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '60vh' }}>
              <textarea 
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                style={{ flex: 1, padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', resize: 'none', fontFamily: 'inherit', fontSize: '16px', lineHeight: '1.6' }}
                placeholder="Start typing your notes here..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveNote} disabled={isSavingNote} style={{ padding: '12px 32px' }}>
                  {isSavingNote ? 'Saving...' : 'Save Notes'}
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (courseMainView === 'queries') {
        return (
          <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ marginBottom: '8px' }}>Queries & Complaints</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Have a complaint or a question about {selectedCourse.title}? Submit a query below and the academic office will be notified.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '50vh' }}>
              <textarea 
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                style={{ flex: 1, padding: '24px', border: '1px solid var(--border-color)', borderRadius: '12px', resize: 'none', fontFamily: 'inherit', fontSize: '16px', lineHeight: '1.6' }}
                placeholder="Describe your issue or query..."
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSubmitQuery} disabled={isSubmittingQuery || !queryText.trim()} style={{ padding: '12px 32px' }}>
                  {isSubmittingQuery ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </div>
          </div>
        );
      }

      if (courseMainView === 'player' && activeModule) {
        const currentModuleInfo = courseData?.modules?.[activeModule.modNum];
        return (
          <CoursePlayer 
            moduleKey={activeModule.modKey} 
            moduleNum={activeModule.modNum}
            courseTitle={selectedCourse.title}
            moduleData={progress[activeModule.modKey]}
            moduleInfo={currentModuleInfo}
            userId={user.id}
            courseId={selectedCourse.id}
            isPreviewMode={isPreviewMode}
            updateProgress={updateModuleProgress}
            onNextModule={() => {
              const nextMod = activeModule.modNum + 1;
              if (nextMod <= selectedCourse.totalModules) {
                handleModuleClick(selectedCourse.id, nextMod);
              } else {
                setCurrentView('course-completed');
              }
            }}
          />
        );
      }

      return (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <h2>Select a module from the sidebar to begin.</h2>
        </div>
      );
    }

    if (currentView === 'browse') {
      return (
        <div className="course-catalog">
          <h2>Browse Available Courses</h2>
          <div className="course-cards" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))' }}>
            {coursesList.map(course => (
              <div key={course.id} className="course-card big-card" onClick={() => handleCourseStart(course)}>
                <div className="card-image" style={{ backgroundImage: `url(${course.image})` }}></div>
                <div className="card-content">
                  <h3>{course.title}</h3>
                  <p className="card-desc">{course.description}</p>
                  <div className="card-meta">
                    <span>{course.totalModules} Modules</span>
                    <span className="badge">Mandatory Faculty Training</span>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
                    Open Course
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (currentView === 'completed') {
      const completedCourses = coursesList.filter(c => isCourseCompleted(c.id));
      return (
        <div className="course-catalog">
          <h2>Courses Completed</h2>
          {completedCourses.length > 0 ? (
            <div className="course-cards">
              {completedCourses.map(course => (
                <div key={course.id} className="course-card big-card" style={{ borderLeft: '4px solid var(--success)' }}>
                  <div className="card-image" style={{ backgroundImage: `url(${course.image})`, filter: 'grayscale(100%)' }}></div>
                  <div className="card-content">
                    <h3>{course.title}</h3>
                    <p className="card-desc">You have successfully completed all modules and passed the mandatory assessments for this course.</p>
                    <p style={{ color: 'var(--success)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                      <CheckCircle size={16} /> Fully Completed & Certified
                    </p>
                    <button 
                      style={{ 
                        width: '100%', padding: '14px', marginTop: 'auto', 
                        background: 'var(--primary)', 
                        color: 'white', border: 'none', borderRadius: '4px', 
                        fontWeight: '600', fontSize: '15px', display: 'flex', 
                        justifyContent: 'center', alignItems: 'center', gap: '8px',
                        cursor: 'pointer', transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'var(--primary-hover)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'var(--primary)'; }}
                      onClick={() => alert(`Certificate of Completion issued to ${user.name} for Faculty Sensitization.`)}
                    >
                      <Award size={18} /> View Verified Certificate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="course-empty-state" style={{ marginTop: '60px' }}>
              <Award style={{ width: '64px', height: '64px', color: '#cbd5e1', marginBottom: '16px' }} />
              <h3>No courses completed yet</h3>
              <p>Finish all modules in a course to earn your official completion certificate.</p>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="app-layout" style={{ position: 'relative' }}>
      {renderSidebar()}
      <div className="main-area" style={{ position: 'relative', flex: 1 }}>
        {renderMainArea()}
        
        {/* Floating Notes Toggle Button */}
        {currentView === 'course' && (
          <button 
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            style={{
              position: 'absolute',
              right: isNotesOpen ? '320px' : '0',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              padding: '16px 8px',
              borderTopLeftRadius: '8px',
              borderBottomLeftRadius: '8px',
              cursor: 'pointer',
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              transition: 'right 0.3s ease',
              boxShadow: '-2px 0 8px rgba(0,0,0,0.1)'
            }}
          >
            <FileText size={20} />
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontWeight: '600', letterSpacing: '2px' }}>NOTES</span>
          </button>
        )}
      </div>

      {/* Right Side Notes Panel */}
      <div style={{
        width: '320px',
        background: 'white',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'absolute',
        right: isNotesOpen ? '0' : '-320px',
        top: 0,
        bottom: 0,
        transition: 'right 0.3s ease',
        zIndex: 40,
        boxShadow: isNotesOpen ? '-4px 0 16px rgba(0,0,0,0.05)' : 'none'
      }}>
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={18} /> My Notes</h3>
          <button onClick={() => setIsNotesOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>&times;</span>
          </button>
        </div>
        <div style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <textarea 
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            style={{ flex: 1, width: '100%', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', resize: 'none', fontFamily: 'inherit', fontSize: '14px', lineHeight: '1.6', background: '#fafafa' }}
            placeholder="Write your notes here while watching the lecture..."
          />
        </div>
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)' }}>
          <button className="btn btn-primary" onClick={handleSaveNote} disabled={isSavingNote} style={{ width: '100%', justifyContent: 'center' }}>
            {isSavingNote ? 'Saving...' : 'Save Notes'}
          </button>
        </div>
      </div>
    </div>
  );
}
