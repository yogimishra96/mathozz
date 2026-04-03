import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppService, calcXP, PROBLEM_TIME } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Setup navigator mock
    Object.defineProperty(window, 'navigator', {
      value: {
        userAgent: 'test-user-agent',
      },
      writable: true,
    });

    TestBed.configureTestingModule({});
    service = TestBed.inject(AppService);
  });

  describe('Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(service.currentScreen()).toBe('home');
      expect(service.user()).toBeNull();
      expect(service.isLoading()).toBe(false);
      expect(service.isDarkMode()).toBe(true);
    });
  });

  describe('calcXP function', () => {
    it('should calculate XP correctly for easy difficulty', () => {
      const xp = calcXP('easy', 3000, 0);
      expect(xp).toBe(8); // base 10 * 0.8 speed factor
    });

    it('should calculate XP correctly for medium difficulty', () => {
      const xp = calcXP('medium', 2000, 0);
      expect(xp).toBe(16); // base 20 * 0.8 speed factor
    });

    it('should calculate XP correctly for hard difficulty', () => {
      const xp = calcXP('hard', 1000, 0);
      expect(xp).toBe(28); // base 35 * 0.8 speed factor
    });

    it('should apply streak bonus', () => {
      const xp = calcXP('easy', 3000, 10); // 5 full milestones = 50% bonus
      expect(xp).toBe(12); // 8 * 1.5
    });

    it('should cap speed factor at minimum', () => {
      const xp = calcXP('easy', 20000, 0); // Very slow
      expect(xp).toBe(4); // 10 * 0.4 minimum
    });
  });

  describe('Game Logic', () => {
    beforeEach(() => {
      service.startGame();
    });

    describe('startGame', () => {
      it('should reset all game state', () => {
        service.startGame();

        expect(service.sessionCorrect()).toBe(0);
        expect(service.sessionWrong()).toBe(0);
        expect(service.sessionTotal()).toBe(0);
        expect(service.sessionXP()).toBe(0);
        expect(service.streak()).toBe(0);
        expect(service.currentInput()).toBe('');
        expect(service.feedback()).toBeNull();
        expect(service.currentScreen()).toBe('game');
      });
    });

    describe('buildProblem', () => {
      it('should generate valid problems', () => {
        // Set streak to 0 for easy difficulty
        service['streak'].set(0);

        const problem = service['buildProblem']();

        expect(['+', '-', '×', '÷']).toContain(problem.operator);
        expect(typeof problem.num1).toBe('number');
        expect(typeof problem.num2).toBe('number');
        expect(typeof problem.answer).toBe('number');

        if (problem.operator === '+') {
          expect(problem.answer).toBe(problem.num1 + problem.num2);
        }
      });

      it('should generate harder problems for higher streaks', () => {
        // Set streak to 25 for hard difficulty
        service['streak'].set(25);

        const problem = service['buildProblem']();

        if (problem.operator === '+') {
          expect(problem.num1).toBeGreaterThanOrEqual(50);
          expect(problem.num2).toBeGreaterThanOrEqual(50);
        }
      });
    });

    describe('submitAnswer', () => {
      beforeEach(() => {
        service.startGame();
        // Mock a simple problem
        service['currentProblem'].set({ num1: 5, num2: 3, operator: '+', answer: 8 });
        service['currentInput'].set('8');
      });

      it('should handle correct answer', async () => {
        await service.submitAnswer();

        expect(service.sessionCorrect()).toBe(1);
        expect(service.sessionTotal()).toBe(1);
        expect(service.streak()).toBe(1);
        expect(service.feedback()).toBe('correct');
        expect(service.isTransitioning()).toBe(true);
      });

      it('should handle incorrect answer', async () => {
        service['currentInput'].set('5');

        await service.submitAnswer();

        expect(service.sessionWrong()).toBe(1);
        expect(service.sessionTotal()).toBe(1);
        expect(service.streak()).toBe(0);
        expect(service.feedback()).toBe('wrong');
      });

      it('should not submit when transitioning', async () => {
        service['isTransitioning'].set(true);

        await service.submitAnswer();

        expect(service.sessionTotal()).toBe(0);
      });

      it('should not submit empty input', async () => {
        service['currentInput'].set('');

        await service.submitAnswer();

        expect(service.sessionTotal()).toBe(0);
      });
    });

    describe('endGame', () => {
      it('should stop timer and change screen', () => {
        service.endGame();

        expect(service.currentScreen()).toBe('result');
      });
    });
  });

  describe('Timer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should start and stop timer correctly', () => {
      service['startTimer']();

      expect(service.timeLeft()).toBe(PROBLEM_TIME);

      // Fast-forward 2 seconds
      vi.advanceTimersByTime(2000);

      expect(service.timeLeft()).toBe(PROBLEM_TIME - 2);

      service.stopTimer();

      // Timer should not continue
      vi.advanceTimersByTime(2000);
      expect(service.timeLeft()).toBe(PROBLEM_TIME - 2);
    });

    it('should handle timeout', () => {
      service.startGame();
      service['startTimer']();

      // Fast-forward to timeout
      vi.advanceTimersByTime(PROBLEM_TIME * 1000);

      expect(service.sessionWrong()).toBe(1);
      expect(service.streak()).toBe(0);
      expect(service.feedback()).toBe('wrong');
    });
  });

  describe('Numpad Input', () => {
    beforeEach(() => {
      service.startGame();
    });

    it('should append digits', () => {
      service.pressDigit('1');
      expect(service.currentInput()).toBe('1');

      service.pressDigit('2');
      expect(service.currentInput()).toBe('12');
    });

    it('should limit input length', () => {
      const longInput = '1234567';
      service['currentInput'].set(longInput);

      service.pressDigit('8');
      expect(service.currentInput()).toBe(longInput);
    });

    it('should handle backspace', () => {
      service['currentInput'].set('123');
      service.pressBackspace();
      expect(service.currentInput()).toBe('12');
    });

    it('should handle clear', () => {
      service['currentInput'].set('123');
      service.pressClear();
      expect(service.currentInput()).toBe('');
    });

    it('should not accept input when transitioning', () => {
      service['isTransitioning'].set(true);

      service.pressDigit('1');
      service.pressBackspace();
      service.pressClear();

      expect(service.currentInput()).toBe('');
    });
  });

  describe('Guest Functionality', () => {
    beforeEach(() => {
      (window.localStorage.getItem as any).mockReturnValue(null);
      (window.localStorage.setItem as any).mockImplementation(() => {});
      (window.localStorage.removeItem as any).mockImplementation(() => {});
    });

    it('should load guest data from localStorage', () => {
      const guestData = { solved: 5, correct: 3, streak: 2, bestStreak: 4, topSession: 10, xp: 50 };
      (window.localStorage.getItem as any).mockReturnValue(JSON.stringify(guestData));

      service['loadGuestData']();

      expect(service.guestSolvedCount()).toBe(5);
    });

    it('should handle invalid localStorage data', () => {
      (window.localStorage.getItem as any).mockReturnValue('invalid json');

      const result = service['readGuestData']();

      expect(result).toEqual({ solved: 0, correct: 0, streak: 0, bestStreak: 0, topSession: 0, xp: 0 });
    });

    it('should update guest stats', () => {
      service['updateGuest'](true, 10);

      expect(window.localStorage.setItem).toHaveBeenCalledWith(
        'mathozz_guest',
        JSON.stringify({ solved: 1, correct: 1, streak: 1, bestStreak: 1, topSession: 0, xp: 10 })
      );
    });

    it('should clear guest data', () => {
      service['clearGuestData']();

      expect(window.localStorage.removeItem).toHaveBeenCalledWith('mathozz_guest');
      expect(service.guestSolvedCount()).toBe(0);
    });
  });

  describe('Daily Streak', () => {
    it('should calculate streak for first day', () => {
      const result = service['calcDailyStreak']('', 0);
      expect(result.dailyStreak).toBe(1);
    });

    it('should maintain streak for same day', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = service['calcDailyStreak'](today, 5);
      expect(result.dailyStreak).toBe(5);
    });

    it('should increment streak for consecutive days', () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const result = service['calcDailyStreak'](yesterday, 3);
      expect(result.dailyStreak).toBe(4);
    });

    it('should reset streak for missed days', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0];
      const result = service['calcDailyStreak'](twoDaysAgo, 3);
      expect(result.dailyStreak).toBe(1);
    });
  });

  describe('Geolocation', () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    it('should detect location successfully', async () => {
      const mockResponse = {
        country_name: 'United States',
        city: 'New York'
      };

      (globalThis.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await service['detectLocation']();

      expect(service.userCountry()).toBe('United States');
      expect(service.userCity()).toBe('New York');
    });

    it('should handle fetch errors gracefully', async () => {
      (globalThis.fetch as any).mockRejectedValue(new Error('Network error'));

      await service['detectLocation']();

      expect(service.userCountry()).toBe('');
      expect(service.userCity()).toBe('');
    });
  });

  describe('Theme', () => {
    beforeEach(() => {
      (window.localStorage.getItem as any).mockReturnValue(null);
      (window.localStorage.setItem as any).mockImplementation(() => {});
    });

    it('should load theme preference', () => {
      (window.localStorage.getItem as any).mockReturnValue('light');

      service['loadThemePref']();

      expect(service.isDarkMode()).toBe(false);
    });

    it('should toggle dark mode', () => {
      service.toggleDarkMode();

      expect(service.isDarkMode()).toBe(false);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('mathozz_theme', 'light');

      service.toggleDarkMode();

      expect(service.isDarkMode()).toBe(true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('mathozz_theme', 'dark');
    });
  });

  describe('Computed Values', () => {
    it('should calculate difficulty based on streak', () => {
      service['streak'].set(0);
      expect(service.difficulty()).toBe('easy');

      service['streak'].set(10);
      expect(service.difficulty()).toBe('medium');

      service['streak'].set(25);
      expect(service.difficulty()).toBe('hard');
    });

    it('should determine if user is guest', () => {
      expect(service.isGuest()).toBe(true);

      service['user'].set({ uid: '123', displayName: 'Test', email: 'test@example.com' } as any);
      expect(service.isGuest()).toBe(false);
    });

    it('should calculate session accuracy', () => {
      service['sessionCorrect'].set(8);
      service['sessionWrong'].set(2);

      expect(service.sessionAccuracy()).toBe(80);
    });

    it('should handle zero total for accuracy', () => {
      expect(service.sessionAccuracy()).toBe(0);
    });
  });

  describe('Sound', () => {
    beforeEach(() => {
      globalThis.AudioContext = vi.fn().mockImplementation(() => ({
        createOscillator: vi.fn(() => ({
          connect: vi.fn(),
          type: '',
          frequency: { setValueAtTime: vi.fn() },
          start: vi.fn(),
          stop: vi.fn(),
        })),
        createGain: vi.fn(() => ({
          connect: vi.fn(),
          gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        })),
        destination: {},
        currentTime: 0,
      }));
    });

    it('should play correct sound', () => {
      service.playSound('correct');

      expect(globalThis.AudioContext).toHaveBeenCalled();
    });

    it('should play wrong sound', () => {
      service.playSound('wrong');

      expect(globalThis.AudioContext).toHaveBeenCalled();
    });

    it('should play streak sound', () => {
      service.playSound('streak');

      expect(globalThis.AudioContext).toHaveBeenCalled();
    });
  });

  describe('Confetti', () => {
    beforeEach(() => {
      globalThis.document = {
        ...globalThis.document,
        createElement: vi.fn(() => ({
          style: {},
          width: 800,
          height: 600,
          getContext: vi.fn(() => ({
            clearRect: vi.fn(),
            save: vi.fn(),
            translate: vi.fn(),
            rotate: vi.fn(),
            fillStyle: '',
            fillRect: vi.fn(),
            restore: vi.fn(),
          })),
        })),
        body: {
          appendChild: vi.fn(),
        },
      } as any;
    });

    it('should trigger confetti animation', () => {
      service.triggerConfetti();

      expect(globalThis.document.createElement).toHaveBeenCalledWith('canvas');
      expect(globalThis.document.body.appendChild).toHaveBeenCalled();
    });
  });
});