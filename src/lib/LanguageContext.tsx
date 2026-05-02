import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'te' | 'hi';

interface Translations {
  [key: string]: {
    [key in Language]: string;
  };
}

export const translations: Translations = {
  // Shell / Navigation
  dashboard: { en: 'Dashboard', te: 'డాష్‌బోర్డ్', hi: 'डैशबोर्ड' },
  predictive: { en: 'Predictive Engine', te: 'ప్రిడిక్టివ్ ఇంజిన్', hi: 'भविष्यवाणी इंजन' },
  assistant: { en: 'Health Chat', te: 'ఆరోగ్య చాట్', hi: 'स्वास्थ्य चैट' },
  reports: { en: 'Medical Reports', te: 'వైద్య నివేదికలు', hi: 'चिकित्सा रिपोर्ट' },
  settings: { en: 'Settings', te: 'సెట్టింగులు', hi: 'सेटिंग्स' },
  
  // Dashboard
  patient_activity: { en: 'Patient Activity Hub', te: 'రోగి కార్యకలాపాల కేంద్రం', hi: 'रोगी गतिविधि केंद्र' },
  recent_checkups: { en: 'Recent Checkup Details', te: 'ఇటీవలి తనిఖీ వివరాలు', hi: 'हालिया जाँच विवरण' },
  medical_precautions: { en: 'Medical Precautions & Advice', te: 'వైద్య జాగ్రత్తలు & సలహాలు', hi: 'चिकित्सा सावधानियां और सलाह' },
  quick_support: { en: 'Quick Support', te: 'శీఘ్ర మద్దతు', hi: 'त्वरित सहायता' },
  medical_log: { en: 'Medical Log', te: 'వైద్య లాగ్', hi: 'मेडिकल लॉग' },
  emergency: { en: 'Emergency Contact', te: 'అత్యవసర సంప్రదింపులు', hi: 'आपातकालीन संपर्क' },
  emergency_sub: { en: 'Dial 108 Instant', te: '108 కి కాల్ చేయండి', hi: '108 डायल करें' },
  ai_assistant: { en: 'AI Assistant', te: 'AI అసిస్టెంట్', hi: 'AI सहायक' },
  ai_assistant_sub: { en: 'Neural Health Chat', te: 'చాట్ చేయండి', hi: 'चैट करें' },
  hospital_locator: { en: 'Hospital Locator', te: 'హాస్పిటల్ లోకేటర్', hi: 'अस्पताल खोजक' },
  hospital_locator_sub: { en: 'Find Nearest Support', te: 'దగ్గరి ఆసుపత్రిని కనుగొనండి', hi: 'निकटतम अस्पताल खोजें' },
  
  // Assistant
  health_support: { en: 'Live Health Support', te: 'లైవ్ హెల్త్ సపోర్ట్', hi: 'लाइव स्वास्थ्य सहायता' },
  ai_helper_desc: { en: 'Personal AI assistant for symptoms, lifestyle, and health guidance.', te: 'లక్షణాలు, జీవనశైలి మరియు ఆరోగ్య మార్గదర్శకత్వం కోసం వ్యక్తిగత AI అసిస్టెంట్.', hi: 'लक्षणों, जीवनशैली और स्वास्थ्य मार्गदर्शन के लिए व्यक्तिगत AI सहायक।' },
  type_message: { en: 'Describe symptoms or ask a health question...', te: 'లక్షణాలను వివరించండి లేదా ఆరోగ్య ప్రశ్న అడగండి...', hi: 'लक्षणों का वर्णन करें या स्वास्थ्य संबंधी प्रश्न पूछें...' },
  voice_start: { en: 'Voice mode activated. Speak now.', te: 'వాయిస్ మోడ్ యాక్టివేట్ చేయబడింది. ఇప్పుడు మాట్లాడండి.', hi: 'वॉयस मोड सक्रिय। अब बोलें।' },
  voice_stop: { en: 'Listening stopped.', te: 'వినడం ఆగింది.', hi: 'सुनना बंद हो गया।' },
  medication_checker: { en: 'Medication Interaction Checker', te: 'మందుల సంకర్షణ తనిఖీ', hi: 'दवा इंटरेक्शन चेकर' },
  
  // Predictive
  start_analysis: { en: 'Vitals Predictive Engine', te: 'వైటల్స్ ప్రిడిక్టివ్ ఇంజిన్', hi: 'वाइटल्स प्रेडिक्टिव इंजन' },
  export_report: { en: 'Export Report', te: 'నివేదికను ఎగుమతి చేయండి', hi: 'रिपोर्ट निर्यात करें' },
  
  // Landing Page
  hero_title: { en: 'Next-Gen Clinical Intelligence', te: 'నెక్స్ట్-జెన్ క్లినికల్ ఇంటెలిజెన్స్', hi: 'अगली पीढ़ी की क्लीनिकल इंटेलिजेंस' },
  hero_subtitle: { en: 'Unified health ecosystem powered by DeepSeek-R1 and Gemini for revolutionary diagnostics.', te: 'విప్లవాత్మక డయాగ్నోస్టిక్స్ కోసం డీప్‌సీక్-R1 మరియు జెమిని ద్వారా నడిచే ఏకీకృత ఆరోగ్య పర్యావరణ వ్యవస్థ.', hi: 'क्रांतिकारी निदान के लिए डीपसीक-R1 और जेमिनी द्वारा संचालित एकीकृत स्वास्थ्य पारिस्थितिकी तंत्र।' },
  get_started: { en: 'Get Started', te: 'ప్రారంభించండి', hi: 'शुरू करें' },
  login_portal: { en: 'Login Portal', te: 'లాగిన్ పోర్టల్', hi: 'लॉगिन पोर्टल' },

  // Image Scanner
  image_scanner: { en: 'Visual Health Labs', te: 'విజువల్ హెల్త్ లాబ్స్', hi: 'विजुअल हेल्थ लैब्स' },
  scanner_desc: { en: 'Process visual biomarkers with hybrid AI scanning.', te: 'హైబ్రిడ్ AI స్కానింగ్‌తో విజువల్ బయోమార్కర్లను ప్రాసెస్ చేయండి.', hi: 'हाइब्रिड एआई स्कैनिंग के साथ दृश्य बायोमार्कर संसाधित करें।' },
  upload_image: { en: 'Upload Health Evidence', te: 'ఆరోగ్య సాక్ష్యాన్ని అప్‌లోడ్ చేయండి', hi: 'स्वास्थ्य साक्ष्य अपलोड करें' },
  analyzing_neural: { en: 'Neural Scanning...', te: 'న్యూరల్ స్కానింగ్...', hi: 'न्यूरल स्कैनिंग...' },

  // Medicine Analyzer
  med_analyzer: { en: 'Pharma Analysis', te: 'ఫార్మా విశ్లేషణ', hi: 'फार्मा विश्लेषण' },
  med_analyzer_desc: { en: 'Deep analysis of pharmacology, usage, and critical warnings.', te: 'ఫార్మకాలజీ, ఉపయోగం మరియు క్లిష్టమైన హెచ్చరికల యొక్క లోతైన విశ్లేషణ.', hi: 'फार्माकोलॉजी, उपयोग और महत्वपूर्ण चेतावनियों का गहरा विश्लेषण।' },
  analyze: { en: 'Analyze', te: 'విశ్లేషించండి', hi: 'विश्लेषण करें' },
  medicine_placeholder: { en: 'Enter medicine name...', te: 'మందు పేరు నమోదు చేయండి...', hi: 'दवा का नाम दर्ज करें...' },
  close: { en: 'Close', te: 'మూసివేయి', hi: 'बंद करें' },
  interaction_checker: { en: 'Interaction Checker', te: 'పరస్పర చర్య తనిఖీ', hi: 'इंटरेक्शन चेकर' },
  thinking: { en: 'Thinking...', te: 'ఆలోచిస్తోంది...', hi: 'सोच रहे हैं...' },
  see_all: { en: 'See All', te: 'అన్నీ చూడండి', hi: 'सभी देखें' },
  vital_info: { en: 'Vital Info', te: 'వైటల్ సమాచారం', hi: 'महत्वपूर्ण जानकारी' },
  bio_metrics: { en: 'Bio-Metrics', te: 'బయో-మెట్రిక్స్', hi: 'बायो-मेट्रिक्स' },
  background: { en: 'Background', te: 'నేపథ్యం', hi: 'पृष्ठभूमि' },
  confirmation: { en: 'Confirmation', te: 'ధృవీకరణ', hi: 'पुष्टि' },
  run_inference: { en: 'Run Inference', te: 'విశ్లేషణను అమలు చేయి', hi: 'विश्लेषण चलाएं' },
  back: { en: 'Back', te: 'వెనుకకు', hi: 'पीछे' },
  next: { en: 'Next', te: 'తరువాత', hi: 'आगे' },
  logout: { en: 'Logout System', te: 'సిస్టమ్ నుండి నిష్క్రమించు', hi: 'सिस्टम लॉगआउट' },
  system_status: { en: 'System Status', te: 'సిస్టమ్ స్థితి', hi: 'सिस्टम स्थिति' },
  active: { en: 'Active', te: 'క్రియాశీల వాడుకలో ఉంది', hi: 'सक्रिय' },
  health_alerts: { en: 'Health Alerts', te: 'ఆరోగ్య హెచ్చరికలు', hi: 'स्वास्थ्य अलर्ट' },
  critical_situation: { en: 'Critical Situation Detected', te: 'క్లిష్ట పరిస్థితి గుర్తించబడింది', hi: 'गंभीर स्थिति का पता चला' },
  doctor_consult_suggested: { en: 'Based on your recent checkup, an instant doctor consultation is highly suggested.', te: 'మీ ఇటీవలి తనిఖీ ఆధారంగా, తక్షణ వైద్యుని సంప్రదింపులు బాగా సూచించబడ్డాయి.', hi: 'आपकी हालिया जाँच के आधार पर, तत्काल डॉक्टर से परामर्श करने की अत्यधिक सलाह दी जाती है।' },
  waiting_doctor: { en: 'Waiting for Doctor...', te: 'వైద్యుని కోసం వేచి ఉంది...', hi: 'डॉक्टर का इंतज़ार है...' },
  request_instant_meet: { en: 'Request Instant Meet', te: 'తక్షణ సమావేశాన్ని అభ్యర్థించండి', hi: 'तत्काल मुलाकात का अनुरोध करें' },
  available_experts: { en: 'Available Experts', te: 'అందుబాటులో ఉన్న నిపుణులు', hi: 'उपलब्ध विशेषज्ञ' },
  online: { en: 'Online', te: 'ఆన్‌లైన్', hi: 'ऑनलाइन' },
  view_full_analysis: { en: 'View Full Analysis', te: 'పూర్తి విశ్లేషణను చూడండి', hi: 'पूर्ण विश्लेषण देखें' },
  recent_scans: { en: 'Recent Visual Scans', te: 'ఇటీవలి విజువల్ స్కాన్‌లు', hi: 'हालिया विजुअल स्कैन' },
  no_history: { en: 'No scan history found', te: 'స్కాన్ చరిత్ర ఏదీ కనుగొనబడలేదు', hi: 'कोई स्कैन इतिहास नहीं मिला' },
  view_report: { en: 'Detailed Report', te: 'వివరణాత్మక నివేదిక', hi: 'विस्तृत रिपोर्ट' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
