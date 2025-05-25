import uiReducer, {
  selectCountry,
  closeCountryPanel,
  openPanel,
  closePanel,
  setMapMode,
  addNotification,
  removeNotification,
  clearAllNotifications,
  UIState, // Assuming UIState is exported or define a similar type for tests
} from './uislice-component'; // Adjust path if your slice is elsewhere
import { MapMode } from './map-state'; // Assuming MapMode is exported

const getInitialState = (): UIState => ({
  selectedCountryId: null,
  activePanelId: null,
  mapMode: 'political',
  notifications: [],
});

describe('uiSlice', () => {
  let initialState: UIState;

  beforeEach(() => {
    initialState = getInitialState();
  });

  test('should return the initial state', () => {
    expect(uiReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  test('selectCountry should set selectedCountryId', () => {
    const countryId = 'USA';
    const actual = uiReducer(initialState, selectCountry(countryId));
    expect(actual.selectedCountryId).toEqual(countryId);
  });

  test('closeCountryPanel should set selectedCountryId to null', () => {
    const stateWithCountrySelected = { ...initialState, selectedCountryId: 'USA' };
    const actual = uiReducer(stateWithCountrySelected, closeCountryPanel());
    expect(actual.selectedCountryId).toBeNull();
  });

  test('openPanel should set activePanelId', () => {
    const panelId = 'policyPanel';
    const actual = uiReducer(initialState, openPanel(panelId));
    expect(actual.activePanelId).toEqual(panelId);
  });

  test('closePanel should set activePanelId to null', () => {
    const stateWithPanelOpen = { ...initialState, activePanelId: 'policyPanel' };
    const actual = uiReducer(stateWithPanelOpen, closePanel());
    expect(actual.activePanelId).toBeNull();
  });

  test('setMapMode should update mapMode', () => {
    const newMode: MapMode = 'economy';
    const actual = uiReducer(initialState, setMapMode(newMode));
    expect(actual.mapMode).toEqual(newMode);
  });

  describe('notifications', () => {
    test('addNotification should add a new notification and assign an ID and timestamp', () => {
      const notificationPayload = { message: 'Test notification', type: 'info' as 'info' | 'warning' | 'error' | 'success' };
      // Mock Date.now() to control timestamp and ID generation
      const mockTimestamp = 1678886400000; // Example: March 15, 2023
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      const actual = uiReducer(initialState, addNotification(notificationPayload));
      
      expect(actual.notifications).toHaveLength(1);
      expect(actual.notifications[0]).toEqual(expect.objectContaining({
        id: mockTimestamp.toString(),
        message: notificationPayload.message,
        type: notificationPayload.type,
        timestamp: mockTimestamp,
      }));
      
      (Date.now as jest.Mock).mockRestore(); // Clean up mock
    });

    test('addNotification should maintain a maximum of 5 notifications (FIFO)', () => {
      let state = initialState;
      for (let i = 0; i < 7; i++) {
        state = uiReducer(state, addNotification({ message: `Msg ${i}`, type: 'info' }));
      }
      expect(state.notifications).toHaveLength(5);
      expect(state.notifications[0].message).toEqual('Msg 2'); // First two should be shifted out
      expect(state.notifications[4].message).toEqual('Msg 6');
    });

    test('removeNotification should remove a notification by id', () => {
      const notification1 = { id: '1', message: 'Msg 1', type: 'info' as const, timestamp: Date.now() };
      const notification2 = { id: '2', message: 'Msg 2', type: 'success' as const, timestamp: Date.now() + 1000 };
      const stateWithNotifications = { ...initialState, notifications: [notification1, notification2] };
      
      const actual = uiReducer(stateWithNotifications, removeNotification('1'));
      expect(actual.notifications).toHaveLength(1);
      expect(actual.notifications[0].id).toEqual('2');
    });

    test('clearAllNotifications should remove all notifications', () => {
      const notification1 = { id: '1', message: 'Msg 1', type: 'info' as const, timestamp: Date.now() };
      const stateWithNotifications = { ...initialState, notifications: [notification1] };
      
      const actual = uiReducer(stateWithNotifications, clearAllNotifications());
      expect(actual.notifications).toHaveLength(0);
    });
  });
});
```
