/* global SpeechSynthesisUtterance */

export function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function getSpeechVoices() {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
}

export function speak(text, voicePreference) {
  if (!('speechSynthesis' in window) || !text) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = getSpeechVoices();
  const preferredVoices = voicePreference === 'male'
    ? voices.filter((voice) => /male|david|mark|daniel|alex/i.test(voice.name))
    : voices.filter((voice) => /female|zira|samantha|karen|susan|hazel/i.test(voice.name));
  const voice = preferredVoices[voicePreference === 'female-alt' ? 1 : 0] || preferredVoices[0] || voices.find((item) => item.name === voicePreference);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}
