import { Mixpanel } from 'mixpanel-react-native';

const MIXPANEL_TOKEN = '44c9d6952845f26c209c7e42a6e8b6b3'; // Replace with your token

const trackAutomaticEvents = false;
export const mixpanel = new Mixpanel(MIXPANEL_TOKEN, trackAutomaticEvents);

// Initialize mixpanel
mixpanel.init();

// Track events
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  // Skip tracking for localhost/development
  if (__DEV__) {
    console.log('Development mode - skipping event:', eventName, properties);
    return;
  }

  try {
    mixpanel.track(eventName, properties);
    console.log('Tracked event:', eventName, properties);
  } catch (error) {
    console.error('Mixpanel tracking error:', error);
  }
};

// Identify users
export const identifyUser = (userId: string, userProperties?: Record<string, any>) => {
  try {
    mixpanel.identify(userId);
    if (userProperties) {
      mixpanel.getPeople().set(userProperties);
    }
  } catch (error) {
    console.error('Mixpanel identify error:', error);
  }
};

// Event names constants
export const Events = {
  LOGIN: 'Login',
  SIGNUP: 'Sign Up',
  VIEW_QUIZ: 'View Quiz',
  ANSWER_QUESTION: 'Answer Question',
  COMPLETE_QUIZ: 'Complete Quiz',
  VIEW_PROFILE: 'View Profile',
  UPDATE_PROFILE: 'Update Profile',
  ADD_SUBJECT: 'Add Subject',
  REMOVE_SUBJECT: 'Remove Subject',
  VIEW_HOME: 'View Home',
  REMOVE_RESULTS: 'Remove Results',
  FETCH_AVAILABLE_SUBJECTS: 'Fetch Available Subjects',
  FETCH_MY_SUBJECTS: 'Fetch My Subjects',
  VIEW_SUBJECT: 'View Subject',
  LOAD_QUESTION: 'Load Question',
  RESTART_QUIZ: 'Restart Quiz',
  ROTATE_IMAGE: 'Rotate Image',
  REPORT_ISSUE: 'Report Issue',
  SUBMIT_ANSWER: 'Submit Answer',
  SHOW_FEEDBACK: 'Show Feedback',
  HIDE_FEEDBACK: 'Hide Feedback',
  SKIP_QUESTION: 'Skip Question',
  COMPLETE_ONBOARDING: 'Complete Onboarding'
}; 