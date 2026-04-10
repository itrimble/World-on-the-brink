/**
 * CapacitorPlatform - Bridges native iOS capabilities with the web app.
 * Initializes Capacitor plugins and provides platform detection utilities.
 */
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { createLogger } from '../utils/logger';

const logger = createLogger('CapacitorPlatform');

class CapacitorPlatformService {
  private initialized = false;

  /** True when running inside a native Capacitor shell (iOS/Android) */
  get isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /** True when running on iOS specifically */
  get isIOS(): boolean {
    return Capacitor.getPlatform() === 'ios';
  }

  /** Returns 'ios', 'android', or 'web' */
  get platform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Initialize all Capacitor plugins. Call once at app startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info(`Initializing CapacitorPlatform (platform: ${this.platform})`);

    if (!this.isNative) {
      logger.info('Running on web - skipping native plugin initialization');
      this.initialized = true;
      return;
    }

    try {
      // Configure status bar for iOS
      if (Capacitor.isPluginAvailable('StatusBar')) {
        await StatusBar.setStyle({ style: StatusBarStyle.Dark });
        await StatusBar.setBackgroundColor({ color: '#0a0e1a' });
        logger.info('StatusBar configured');
      }

      // Hide splash screen after app is ready
      if (Capacitor.isPluginAvailable('SplashScreen')) {
        await SplashScreen.hide({ fadeOutDuration: 300 });
        logger.info('SplashScreen hidden');
      }

      // Configure keyboard behavior
      if (Capacitor.isPluginAvailable('Keyboard')) {
        Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
          document.body.classList.add('keyboard-visible');
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.style.setProperty('--keyboard-height', '0px');
          document.body.classList.remove('keyboard-visible');
        });
        logger.info('Keyboard listeners configured');
      }

      // Handle app state changes (background/foreground)
      if (Capacitor.isPluginAvailable('App')) {
        App.addListener('appStateChange', ({ isActive }) => {
          logger.info(`App state changed: ${isActive ? 'foreground' : 'background'}`);
          // Could auto-save when going to background
          if (!isActive) {
            document.dispatchEvent(new CustomEvent('app:background'));
          } else {
            document.dispatchEvent(new CustomEvent('app:foreground'));
          }
        });

        // Handle hardware back button (Android, but good practice)
        App.addListener('backButton', () => {
          document.dispatchEvent(new CustomEvent('app:backButton'));
        });
        logger.info('App lifecycle listeners configured');
      }

      this.initialized = true;
      logger.info('CapacitorPlatform initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize CapacitorPlatform', error);
      this.initialized = true; // Mark as initialized to prevent retries
    }
  }

  // --- Haptic Feedback ---

  /** Light haptic tap - for button presses, selections */
  async hapticLight(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch { /* silently fail */ }
  }

  /** Medium haptic tap - for important actions like policy enactment */
  async hapticMedium(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch { /* silently fail */ }
  }

  /** Heavy haptic tap - for crisis escalation, major events */
  async hapticHeavy(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch { /* silently fail */ }
  }

  /** Success notification haptic */
  async hapticSuccess(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch { /* silently fail */ }
  }

  /** Warning notification haptic */
  async hapticWarning(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Warning });
    } catch { /* silently fail */ }
  }

  /** Error notification haptic */
  async hapticError(): Promise<void> {
    if (!this.isNative) return;
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch { /* silently fail */ }
  }
}

/** Singleton instance */
export const capacitorPlatform = new CapacitorPlatformService();
