import React, { useState, useEffect } from 'react';
import { X, Send, CheckCircle2 } from 'lucide-react';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackSubmission {
  id: string;
  category: string;
  email: string;
  message: string;
  timestamp: string;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<string>('general');
  const [email, setEmail] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  // Honeypot field for bot protection
  const [honeypot, setHoneypot] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [localFeedback, setLocalFeedback] = useState<FeedbackSubmission[]>([]);

  const MAX_CHARACTERS = 500;

  // Load existing feedback from localStorage on open and freeze background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const stored = localStorage.getItem('nba_era_feedback');
      if (stored) {
        try {
          setLocalFeedback(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse local feedback log", e);
        }
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleHoneypotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHoneypot(e.target.value);
  };

  const validateEmail = (emailStr: string): boolean => {
    if (!emailStr) return true; // Optional email
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(emailStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    // Honeypot security check
    if (honeypot.trim() !== '') {
      console.warn("Spam submission blocked via Honeypot check.");
      // Pretend it succeeded to confuse spambots, or block silently
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setSubmitSuccess(true);
        setMessage('');
        setEmail('');
      }, 800);
      return;
    }

    // Message validation
    if (!message.trim()) {
      setErrorMessage('Feedback message cannot be empty.');
      return;
    }

    if (message.length > MAX_CHARACTERS) {
      setErrorMessage(`Feedback exceeds maximum character limit of ${MAX_CHARACTERS} characters.`);
      return;
    }

    // Email validation
    if (email && !validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);

    const submissionId = Math.random().toString(36).substring(2, 9);
    const submissionTimestamp = new Date().toLocaleString();

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: submissionId,
          category,
          email: email.trim(),
          message: message.trim(),
          timestamp: submissionTimestamp,
          honeypot: honeypot
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to submit feedback.');
      }

      const newSubmission: FeedbackSubmission = {
        id: submissionId,
        category,
        email: email.trim(),
        message: message.trim(),
        timestamp: submissionTimestamp
      };

      // Save submission to local storage (local cache history)
      const updatedLog = [newSubmission, ...localFeedback];
      localStorage.setItem('nba_era_feedback', JSON.stringify(updatedLog));
      setLocalFeedback(updatedLog);

      setSubmitSuccess(true);
      setMessage('');
      setEmail('');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to send feedback. Please try again.';
      setErrorMessage(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetSuccessState = () => {
    setSubmitSuccess(false);
  };

  const handleClearHistory = () => {
    localStorage.removeItem('nba_era_feedback');
    setLocalFeedback([]);
  };

  const charactersRemaining = MAX_CHARACTERS - message.length;
  const isOverLimit = message.length > MAX_CHARACTERS;

  return (
    <div className="feedback-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <div className="feedback-modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="feedback-modal-header">
          <h3 id="feedback-title">Share Your Feedback</h3>
          <button className="feedback-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </header>

        <div className="feedback-modal-body">
          {submitSuccess ? (
            <div className="feedback-success-state">
              <CheckCircle2 size={48} className="feedback-success-icon" />
              <h4>Feedback Received!</h4>
              <p>Thank you for helping us improve the NBA Era Translator.</p>
              <button className="feedback-btn-primary" onClick={resetSuccessState}>
                Submit More Feedback
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-form" noValidate>
              {errorMessage && (
                <div className="feedback-error-alert" role="alert">
                  {errorMessage}
                </div>
              )}

              {/* Honeypot Spam Protection Field - Visual-hidden */}
              <div className="feedback-honeypot" style={{ display: 'none' }} aria-hidden="true">
                <label htmlFor="website">Leave this field blank</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  value={honeypot}
                  onChange={handleHoneypotChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="feedback-form-group">
                <label htmlFor="feedback-category">Category</label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="feedback-select"
                >
                  <option value="general">General Feedback</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="data">Data Discrepancy (Stats/Decades)</option>
                </select>
              </div>

              <div className="feedback-form-group">
                <label htmlFor="feedback-email">Email (Optional)</label>
                <input
                  type="email"
                  id="feedback-email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="your@email.com (for replies)"
                  className="feedback-input"
                  maxLength={100}
                />
              </div>

              <div className="feedback-form-group">
                <div className="feedback-label-row">
                  <label htmlFor="feedback-message">Message</label>
                  <span className={`feedback-char-counter ${isOverLimit ? 'over-limit' : charactersRemaining <= 50 ? 'near-limit' : ''}`}>
                    {charactersRemaining} characters remaining
                  </span>
                </div>
                <textarea
                  id="feedback-message"
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="What can we improve? Limit 500 characters..."
                  className={`feedback-textarea ${isOverLimit ? 'textarea-error' : ''}`}
                  rows={4}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || isOverLimit || !message.trim()}
                className="feedback-btn-primary"
              >
                {isSubmitting ? (
                  <span className="feedback-spinner">Sending...</span>
                ) : (
                  <>
                    <Send size={14} style={{ marginRight: 8 }} />
                    Submit Feedback
                  </>
                )}
              </button>
            </form>
          )}



          {/* Local Submissions Log (Mock Database Viewer) */}
          {localFeedback.length > 0 && (
            <div className="feedback-history-section">
              <div className="feedback-history-header">
                <h4>Recent Submissions (LocalStorage Log)</h4>
                <button className="feedback-clear-btn" onClick={handleClearHistory} type="button">
                  Clear
                </button>
              </div>
              <div className="feedback-history-list">
                {localFeedback.map((fb) => (
                  <div key={fb.id} className="feedback-history-item">
                    <div className="history-meta">
                      <span className="history-category">{fb.category.toUpperCase()}</span>
                      <span className="history-time">{fb.timestamp}</span>
                    </div>
                    {fb.email && <div className="history-email">{fb.email}</div>}
                    <p className="history-message">{fb.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
