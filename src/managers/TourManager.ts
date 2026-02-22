import { settingsManager } from './SettingsManager';
import { inventoryManager } from './InventoryManager';

export type TourStep = 
  | 'welcome'
  | 'category'
  | 'subcategory'
  | 'open_search'
  | 'add_item'
  | 'lower_stock'
  | 'magic_cart'
  | 'existing_cart'
  | 'go_shopping'
  | 'finalize_list'
  | 'start_shopping'
  | 'finish_shopping'
  | 'insights_tab'
  | 'notes_tab'
  | 'completed';

export interface TourGuide {
  title: string;
  message: string;
  step: TourStep;
}

const TOUR_STEPS: TourGuide[] = [
  { step: 'welcome', title: 'Welcome to HiHome!', message: 'Let\'s take a quick 1-minute tour. First, tap on the Fridge category.' },
  { step: 'category', title: 'Inside a Category', message: 'Great! This shows all sections in your Fridge. Tap any subcategory to go inside.\n\n💡 Tip: swipe a section {{swipe_left}} to rename or delete it.' },
  { step: 'subcategory', title: 'Adding Items', message: 'Now let\'s add an item — tap the {{plus}} button!\n\n💡 Tip: swipe any item {{swipe_left}} to edit or delete it.' },
  { step: 'add_item', title: 'Adding Items', message: 'Type anything (like "Milk") and hit Add.' },
  { step: 'lower_stock', title: 'Managing Stock', message: 'Look, it\'s magically 100% full! Pretend you drank some. Drag the slider or press the minus button until it turns red (Low Stock).' },
  { step: 'magic_cart', title: 'Smart Shopping', message: 'The {{eye}} next to an item name hides it from shopping. The global search {{search}} floating button lets you find from all items in inventory and update quantity. Now tap the {{wand}} Magic Wand to generate your cart!' },
  { step: 'existing_cart', title: 'You Have a Cart!', message: 'An existing cart is showing. "Continue" won\'t include your test item. Tap "Start New List" to generate a fresh cart with all low-stock items.' },
  { step: 'go_shopping', title: 'Cart Generated!', message: 'You can tap on "Go There" on the alert, or the "Shopping" tab below.' },
  { step: 'finalize_list', title: 'Review & Edit', message: 'Tap {{hidden}} to add hidden items to cart. Tap {{misc}} to add a one-off Misc item (won\'t be stocked). Then tap "Finalize List".' },
  { step: 'start_shopping', title: 'Ready to Shop', message: 'Your list is locked in. Tap "Start Shopping" to begin!' },
  { step: 'finish_shopping', title: 'Shopping in Progress', message: 'Check off your test item and tap "Complete Shopping" at the bottom.' },
  { step: 'insights_tab', title: 'Shopping Complete!', message: 'All checked items are restocked! Your test item is also deleted to keep your inventory clean. Take a peek at the "Insights" tab.' },
  { step: 'notes_tab', title: 'Data Analytics', message: 'Here you can see stale items and stock data. Lastly, tap the "Notes" tab.' },
  { step: 'completed', title: 'You\'re a Pro!', message: 'Write recipes or home notes here! Enjoy HiHome!' },
];

class TourManager {
  private listeners: (() => void)[] = [];
  private onStartListeners: (() => void)[] = [];
  private demoItemId: string | null = null;
  private currentStepIndex: number = 0;

  constructor() {
    this.currentStepIndex = 0;
  }

  async initialize() {
    const s = settingsManager.getTourState();
    if (s === 'not_started') {
      // Tour will be triggered manually after notifications prompt
    } else if (s === 'in_progress') {
      this.currentStepIndex = settingsManager.getTourStep();
    } else {
      this.currentStepIndex = TOUR_STEPS.length - 1;
    }
    this.notifyListeners();
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /** Called when the tour is (re)started — InventoryScreen uses this to reset to home. */
  addOnStartListener(listener: () => void) {
    this.onStartListeners.push(listener);
    return () => {
      this.onStartListeners = this.onStartListeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  get isTourActive(): boolean {
    return settingsManager.getTourState() === 'in_progress' && this.currentStepIndex < TOUR_STEPS.length;
  }

  get currentGuide(): TourGuide | null {
    if (!this.isTourActive) return null;
    return TOUR_STEPS[this.currentStepIndex];
  }

  async startTour() {
    await settingsManager.setTourState('in_progress');
    await settingsManager.setTourStep(0);
    this.currentStepIndex = 0;
    this.demoItemId = null;
    this.onStartListeners.forEach(l => l()); // Signal screens to reset nav
    this.notifyListeners();
  }

  async quitTour() {
    await this.cleanup();
    await settingsManager.setTourState('completed');
    this.notifyListeners();
  }

  async advanceTo(step: TourStep) {
    if (!this.isTourActive) return;
    const targetIdx = TOUR_STEPS.findIndex(s => s.step === step);
    if (targetIdx > this.currentStepIndex) {
      this.currentStepIndex = targetIdx;
      await settingsManager.setTourStep(targetIdx);
      this.notifyListeners();

      if (step === 'completed') {
        setTimeout(() => this.quitTour(), 5000); // Wait 5s then close
      }
    }
  }

  onAction(action: string, context?: any) {
    if (!this.isTourActive) return;

    const step = this.currentGuide?.step;

    switch (action) {
      case 'ENTERED_CATEGORY':
        if (step === 'welcome') this.advanceTo('category');
        break;
      case 'ENTERED_SUBCATEGORY':
        if (step === 'category') this.advanceTo('subcategory');
        break;
      case 'OPENED_ADD_ITEM':
        if (step === 'subcategory') this.advanceTo('add_item');
        break;
      case 'ITEM_ADDED':
        if (step === 'add_item') {
          // Accept whatever the user creates (whether it's Milk, Demo Milk, or anything else).
          this.demoItemId = context?.id; 
          
          // Magically restock it to 100% so the next step makes sense
          if (this.demoItemId) {
            inventoryManager.restockItem(this.demoItemId);
          }
          
          this.advanceTo('lower_stock');
        }
        break;
      case 'STOCK_LOWERED':
        if (step === 'lower_stock' && context < 0.26) {
          this.advanceTo('magic_cart');
        }
        break;
      case 'EXISTING_CART_SHOWN':
        if (step === 'magic_cart') this.advanceTo('existing_cart');
        break;
      case 'MAGIC_CART_CREATED':
        if (step === 'magic_cart' || step === 'existing_cart') this.advanceTo('go_shopping');
        break;
      case 'SWITCHED_TO_SHOPPING':
        if (step === 'go_shopping') this.advanceTo('finalize_list');
        break;
      case 'FINALIZED_LIST':
        if (step === 'finalize_list') this.advanceTo('start_shopping');
        break;
      case 'STARTED_SHOPPING':
        if (step === 'start_shopping') this.advanceTo('finish_shopping');
        break;
      case 'FINISHED_SHOPPING':
        if (step === 'finish_shopping') {
          this.advanceTo('insights_tab');
        }
        break;
      case 'SWITCHED_TO_INSIGHTS':
        if (step === 'insights_tab') this.advanceTo('notes_tab');
        break;
      case 'SWITCHED_TO_NOTES':
        if (step === 'notes_tab') {
          this.advanceTo('completed');
          this.cleanup(); // Clean up immediately, leave message up for 5s
        }
        break;
    }
  }

  private async cleanup() {
    if (this.demoItemId) {
      try {
        await inventoryManager.removeItem(this.demoItemId);
        this.demoItemId = null;
      } catch (e) {
        console.error('Failed to cleanup demo item', e);
      }
    }
  }
}

export const tourManager = new TourManager();
