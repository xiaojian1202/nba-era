import { render, screen, fireEvent, act } from '@testing-library/react';
import { FeedbackModal } from './FeedbackModal';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('FeedbackModal Component', () => {
  let fetchMock: any;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ status: 'success' })
      })
    );
    vi.stubGlobal('fetch', fetchMock);
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<FeedbackModal isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders modal elements when isOpen is true', () => {
    render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Email (Optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.getByText('500 characters remaining')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Feedback/i })).toBeDisabled();
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    render(<FeedbackModal isOpen={true} onClose={onCloseMock} />);
    
    const closeBtn = screen.getByLabelText('Close modal');
    fireEvent.click(closeBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('freezes body scrolling when isOpen is true and unfreezes when closed or unmounted', () => {
    expect(document.body.style.overflow).toBe('');

    const { unmount } = render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('updates character count as user types', () => {
    render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    
    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello NBA Era' } });
    
    expect(screen.getByText('487 characters remaining')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Feedback/i })).toBeEnabled();
  });

  it('restricts and disables submit when message exceeds 500 characters', () => {
    render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    
    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
    
    // Create string of 501 characters
    const longText = 'a'.repeat(501);
    fireEvent.change(textarea, { target: { value: longText } });
    
    expect(screen.getByText('-1 characters remaining')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit Feedback/i })).toBeDisabled();
  });

  it('validates email syntax and displays error on submit', async () => {
    render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    
    const emailInput = screen.getByLabelText('Email (Optional)') as HTMLInputElement;
    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });

    // Invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(textarea, { target: { value: 'Legit feedback comment.' } });
    
    fireEvent.click(submitBtn);

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  });

  it('submits successfully when fields are valid, saves to localStorage, and updates history list', async () => {
    render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    
    const categorySelect = screen.getByLabelText('Category') as HTMLSelectElement;
    const emailInput = screen.getByLabelText('Email (Optional)') as HTMLInputElement;
    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });

    fireEvent.change(categorySelect, { target: { value: 'bug' } });
    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(textarea, { target: { value: 'Modernization adjustment works great but pace math is off.' } });
    
    expect(submitBtn).toBeEnabled();

    // Submit form
    fireEvent.click(submitBtn);

    // Verify loading spinner/text
    expect(screen.getByText('Sending...')).toBeInTheDocument();

    // Wait for the async fetch request to resolve and render the success state
    await screen.findByText('Feedback Received!');
    expect(screen.getByText('Thank you for helping us improve the NBA Era Translator.')).toBeInTheDocument();

    // Verify localStorage has entry
    const saved = localStorage.getItem('nba_era_feedback');
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].category).toBe('bug');
    expect(parsed[0].email).toBe('user@example.com');
    expect(parsed[0].message).toBe('Modernization adjustment works great but pace math is off.');

    // Click "Submit More Feedback" button to reset form
    const resetBtn = screen.getByRole('button', { name: /Submit More Feedback/i });
    fireEvent.click(resetBtn);

    // Form is reset and history lists the submission
    expect(screen.getByRole('button', { name: /Submit Feedback/i })).toBeDisabled();
    expect(screen.getByText('BUG')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Modernization adjustment works great but pace math is off.')).toBeInTheDocument();
  });

  it('triggers Honeypot protection to block bot spam submissions silently', async () => {
    vi.useFakeTimers();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      render(<FeedbackModal isOpen={true} onClose={() => {}} />);
      
      // Grab elements
      const honeypotInput = screen.getByLabelText('Leave this field blank') as HTMLInputElement;
      const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
      const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });

      // Bot fills the honeypot field
      fireEvent.change(honeypotInput, { target: { value: 'http://spambot-link.com' } });
      fireEvent.change(textarea, { target: { value: 'Spam text message here!' } });

      fireEvent.click(submitBtn);

      // Should trigger console warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Spam submission blocked via Honeypot check'));

      // Fast forward timer
      await act(async () => {
        vi.advanceTimersByTime(800);
      });

      // Simulated success screen is shown to trick the bot into thinking it succeeded
      expect(screen.getByText('Feedback Received!')).toBeInTheDocument();

      // But localStorage remains completely empty
      expect(localStorage.getItem('nba_era_feedback')).toBeNull();
    } finally {
      consoleWarnSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('allows clearing local feedback history log', () => {
    // Populate fake local storage feedback history
    const mockData = [
      { id: '123', category: 'general', email: '', message: 'Test 1', timestamp: '7/6/2026' },
      { id: '456', category: 'feature', email: 'test@email.com', message: 'Test 2', timestamp: '7/6/2026' }
    ];
    localStorage.setItem('nba_era_feedback', JSON.stringify(mockData));

    render(<FeedbackModal isOpen={true} onClose={() => {}} />);

    // Verify both items rendered
    expect(screen.getByText('Test 1')).toBeInTheDocument();
    expect(screen.getByText('Test 2')).toBeInTheDocument();

    // Click clear button
    const clearBtn = screen.getByRole('button', { name: /Clear/i });
    fireEvent.click(clearBtn);

    // Verify history section and storage is wiped
    expect(screen.queryByText('Test 1')).not.toBeInTheDocument();
    expect(screen.queryByText('Test 2')).not.toBeInTheDocument();
    expect(localStorage.getItem('nba_era_feedback')).toBeNull();
  });

  it('displays API error message on submission failure', async () => {
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Server is overloaded. Please try again.' })
      })
    );

    render(<FeedbackModal isOpen={true} onClose={() => {}} />);
    
    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
    const submitBtn = screen.getByRole('button', { name: /Submit Feedback/i });

    fireEvent.change(textarea, { target: { value: 'This should fail' } });
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByRole('alert');
    expect(errorAlert).toHaveTextContent('Server is overloaded. Please try again.');
    expect(submitBtn).toBeEnabled();
  });
});
