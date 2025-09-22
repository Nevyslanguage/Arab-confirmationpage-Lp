import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ZapierService, FormData } from '../services/zapier.service';

@Component({
  selector: 'app-confirmation-page',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './confirmation-page.component.html',
  styleUrl: './confirmation-page.component.css'
})
export class ConfirmationPageComponent implements OnInit, OnDestroy {
  // Development flag to disable Zapier calls during development
  private readonly isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  constructor(private zapierService: ZapierService) {}
  selectedChoice: string = '';
  currentSlide: number = 0;
  slides = [0, 1, 2, 3]; // Four review images
  
  // Form selections
  selectedCancellationReasons: string[] = [];
  selectedSubscription: string = '';
  selectedStartTime: string = '';
  selectedPayment: string = '';
  otherCancellationReason: string = '';

  // Modal properties
  showModal: boolean = false;
  modalImageSrc: string = '';
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  isDragging: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  
  // Touch properties
  isTouching: boolean = false;
  lastTouchX: number = 0;
  lastTouchY: number = 0;
  initialTouchDistance: number = 0;
  initialZoomLevel: number = 1;

  // Pricing section timer
  showPricingPopup: boolean = false;
  private pricingTimer: any;
  private pricingStartTime: number = 0;
  private pricingEndTime: number = 0;
  private totalPricingTime: number = 0;
  private hasShownPricingPopup: boolean = false;
  private pricingSectionVisible: boolean = false;
  
  // Pricing time validation dialog
  showPricingTimeValidation: boolean = false;
  
  // User tracking system
  private sessionId: string = '';
  private sessionStartTime: number = 0;
  private sectionTimers: { [key: string]: { totalTime: number; isActive: boolean; currentSessionStart?: number } } = {};
  private idleTime: { total: number; lastActivity: number; isIdle: boolean; idleThreshold: number } = {
    total: 0,
    lastActivity: 0,
    isIdle: false,
    idleThreshold: 90000 // 90 seconds - very reasonable for reading content
  };
  private idleTimer: any = null;
  
  // Form interaction tracking
  private formStarted: boolean = false;
  private formSubmitted: boolean = false;
  private formStartTime: number = 0;
  
  // URL parameters from leadform
  private urlParams: {
    email?: string;
    name?: string;
    campaignName?: string;
    adsetName?: string;
    adName?: string;
    fbClickId?: string;
  } = {};
  
  // Section to event mapping
  private sectionEvents: { [key: string]: string } = {
    '#pricing-section': 'session_duration_on_price_section',
    '#levels-section': 'session_duration_on_levels_section',
    '#teachers-section': 'session_duration_on_teachers_section',
    '#platform-section': 'session_duration_on_platform_section',
    '#consultants-section': 'session_duration_on_advisors_section',
    '#carousel-section': 'session_duration_on_testimonials_section',
    '#form-section': 'session_duration_on_form_section'
  };
  
  // Plan selection data
  selectedPlan: string = '';
  planSelectionData: any = {
    plan: '',
    timestamp: '',
    sectionViewTime: 0,
    userAgent: '',
    pageUrl: ''
  };

  // Verification page
  showVerificationPage: boolean = false;
  userSelections: any = {
    choice: '',
    cancellationReasons: [],
    subscription: '',
    startTime: '',
    payment: '',
    name: ''
  };

  // Validation properties
  showValidationError: boolean = false;
  validationMessage: string = '';
  nameError: boolean = false;
  nameErrorMessage: string = '';

  // Thanks modal
  showThanksModal: boolean = false;
  
  // Success page modal for cancellations
  showCancellationSuccess: boolean = false;

  onChoiceChange(choice: string) {
    this.selectedChoice = choice;
    
    // Track when user starts filling the form
    if (!this.formStarted) {
      this.formStarted = true;
      this.formStartTime = Date.now();
      console.log('📝 Form started - User selected:', choice, 'at:', new Date(this.formStartTime));
    }
  }

  onWhatsAppClick() {
    if (!this.selectedChoice) {
      this.showValidationErrorModal('يرجى اختيار أحد الخيارات أولاً');
      return;
    }

    // Check if user spent enough time on pricing section (5 seconds = 5000ms)
    // Skip this validation for cancellations since they're not interested in the service
    if (this.selectedChoice !== 'cancel') {
      const totalTimeInSeconds = this.totalPricingTime / 1000;
      console.log('Total time spent on pricing section:', totalTimeInSeconds, 'seconds');
      
      if (totalTimeInSeconds < 5) {
        // Show validation dialog asking if they checked prices
        this.showPricingTimeValidation = true;
        document.body.style.overflow = 'hidden';
        return;
      }
    }
    
    // Validate based on choice
    if (this.selectedChoice === 'cancel') {
      // For cancellation, require at least one cancellation reason
      if (this.selectedCancellationReasons.length === 0) {
        this.showValidationErrorModal('يرجى اختيار سبب واحد على الأقل للإلغاء');
        return;
      }
      
      // If "other reason" is selected, require text input
      if (this.selectedCancellationReasons.includes('other') && (!this.otherCancellationReason || this.otherCancellationReason.trim() === '')) {
        this.showValidationErrorModal('يرجى كتابة السبب الآخر');
        return;
      }
      
      // Require subscription preference
      if (!this.selectedSubscription) {
        this.showValidationErrorModal('يرجى اختيار تفضيل الاشتراك في الرسائل');
        return;
      }
      
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      return;
    }
    
    if (this.selectedChoice === 'confirm') {
      // For confirmation, require start time
      if (!this.selectedStartTime) {
        this.showValidationErrorModal('يرجى اختيار متى تريد البدء');
        return;
      }
      
      // Require payment preference
      if (!this.selectedPayment) {
        this.showValidationErrorModal('يرجى اختيار حالة الدفع');
        return;
      }
      
      // For confirmations, collect all user selections
      this.userSelections = {
        choice: this.selectedChoice,
        cancellationReasons: this.selectedCancellationReasons,
        subscription: this.selectedSubscription,
        startTime: this.selectedStartTime,
        payment: this.selectedPayment,
        name: this.urlParams.name || '' // Use name from URL parameters
      };
      
      // Always show verification page for confirmations (regardless of payment method)
      this.showVerificationPage = true;
      // Prevent body scroll when verification page is open
      document.body.style.overflow = 'hidden';
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    console.log('Next slide:', this.currentSlide, 'Total slides:', this.slides.length);
  }

  previousSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
    console.log('Previous slide:', this.currentSlide, 'Total slides:', this.slides.length);
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    console.log('Go to slide:', this.currentSlide, 'Total slides:', this.slides.length);
  }

  ngOnInit() {
    this.extractUrlParameters();
    this.initializeTracking();
    this.setupIntersectionObservers();
    this.setupIdleTracking();
    this.setupPageUnloadTracking();
  }

  ngOnDestroy() {
    // Send tracking data before component is destroyed (page closing)
    this.sendTrackingData('page_closing');
  }

  // ===== TRACKING SYSTEM METHODS =====

  private extractUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    this.urlParams = {
      email: urlParams.get('email') || undefined,
      name: urlParams.get('name') || undefined,
      campaignName: urlParams.get('Campaign_name') || undefined,
      adsetName: urlParams.get('Adset_name') || undefined,
      adName: urlParams.get('Ad_name') || undefined,
      fbClickId: urlParams.get('fbclid') || undefined
    };
    
    console.log('🔗 URL Parameters extracted:', {
      urlParams: this.urlParams,
      fullUrl: window.location.href,
      searchParams: window.location.search
    });
  }

  private initializeTracking() {
    this.sessionId = this.generateSessionId();
    this.sessionStartTime = Date.now();
    this.idleTime.lastActivity = Date.now();
    
    // Initialize section timers
    Object.keys(this.sectionEvents).forEach(sectionId => {
      this.sectionTimers[sectionId] = {
        totalTime: 0,
        isActive: false
      };
    });
    
    console.log('🎯 Tracking initialized:', {
      sessionId: this.sessionId,
      startTime: new Date(this.sessionStartTime)
    });
  }

  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private setupIntersectionObservers() {
    // Create intersection observer for section tracking
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const sectionId = '#' + entry.target.id;
        
        if (entry.isIntersecting) {
          this.startSectionTimer(sectionId);
        } else {
          this.stopSectionTimer(sectionId);
        }
      });
    }, { threshold: 0.5 });

    // Observe all sections after view init
    setTimeout(() => {
      Object.keys(this.sectionEvents).forEach(sectionId => {
        const element = document.querySelector(sectionId);
        if (element) {
          sectionObserver.observe(element);
          console.log('👀 Observing section:', sectionId);
        } else {
          console.warn('⚠️ Section not found:', sectionId);
        }
      });
    }, 100);

    // Keep existing pricing section observer
    this.setupExistingPricingObserver();
  }

  private setupExistingPricingObserver() {
    // Keep the existing pricing section observer for the popup
    const pricingObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.pricingSectionVisible = entry.isIntersecting;
        if (entry.isIntersecting && !this.hasShownPricingPopup) {
          this.startPricingTimer();
        } else if (!entry.isIntersecting) {
          this.stopPricingTimer();
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      const pricingSection = document.querySelector('#pricing-section');
      if (pricingSection) {
        pricingObserver.observe(pricingSection);
      }
    }, 100);
  }

  private startSectionTimer(sectionId: string) {
    if (this.sectionTimers[sectionId] && !this.sectionTimers[sectionId].isActive) {
      this.sectionTimers[sectionId].isActive = true;
      this.sectionTimers[sectionId].currentSessionStart = Date.now();
      console.log('⏱️ Started timer for:', sectionId);
    }
  }

  private stopSectionTimer(sectionId: string) {
    if (this.sectionTimers[sectionId] && this.sectionTimers[sectionId].isActive) {
      const sessionTime = Date.now() - (this.sectionTimers[sectionId].currentSessionStart || 0);
      this.sectionTimers[sectionId].totalTime += sessionTime;
      this.sectionTimers[sectionId].isActive = false;
      this.sectionTimers[sectionId].currentSessionStart = undefined;
      
      const eventName = this.sectionEvents[sectionId];
      console.log('⏹️ Stopped timer for:', sectionId, 'Session time:', sessionTime, 'ms', 'Total:', this.sectionTimers[sectionId].totalTime, 'ms');
    }
  }

  private setupIdleTracking() {
    const activityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach(event => {
      document.addEventListener(event, () => {
        this.resetIdleTimer();
      }, true);
    });
    
    // Also track when user is actively viewing sections (reading content)
    // This helps distinguish between reading and actual idle time
    this.setupReadingActivityTracking();
  }

  private setupReadingActivityTracking() {
    // Track when user is actively viewing sections
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // User is actively viewing a section - consider this as activity
          this.resetIdleTimer();
          console.log('👀 User actively viewing section:', entry.target.id);
        }
      });
    }, { threshold: 0.5 });

    // Observe all sections for reading activity
    setTimeout(() => {
      Object.keys(this.sectionEvents).forEach(sectionId => {
        const element = document.querySelector(sectionId);
        if (element) {
          sectionObserver.observe(element);
        }
      });
    }, 100);
  }

  private resetIdleTimer() {
    const now = Date.now();
    
    // If user was idle, add the idle time to total
    if (this.idleTime.isIdle) {
      const idlePeriod = now - this.idleTime.lastActivity;
      this.idleTime.total += idlePeriod;
      console.log('🔄 User activity detected. Idle period:', idlePeriod, 'ms, Total idle:', this.idleTime.total, 'ms');
    }
    
    // Reset idle state
    this.idleTime.isIdle = false;
    this.idleTime.lastActivity = now;
    
    // Clear existing timer
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    // Set new idle timer
    this.idleTimer = setTimeout(() => {
      this.idleTime.isIdle = true;
      console.log('😴 User is now idle (no activity for 90+ seconds)');
    }, this.idleTime.idleThreshold);
  }

  private setupPageUnloadTracking() {
    window.addEventListener('beforeunload', () => {
      this.sendTrackingData('page_unload');
    });
  }

  private sendTrackingData(trigger: string) {
    // Stop all active timers
    Object.keys(this.sectionTimers).forEach(sectionId => {
      if (this.sectionTimers[sectionId].isActive) {
        this.stopSectionTimer(sectionId);
      }
    });

    // Add any remaining idle time
    if (this.idleTime.isIdle) {
      const remainingIdle = Date.now() - this.idleTime.lastActivity;
      this.idleTime.total += remainingIdle;
    }

    // Calculate form interaction time for submitters
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare Zapier webhook data for lead update
    const zapierData = {
      // Lead identification (from previous form)
      lead_email: this.urlParams.email,
      lead_name: this.urlParams.name,
      
      // Campaign tracking data
      campaign_name: this.urlParams.campaignName,
      adset_name: this.urlParams.adsetName,
      ad_name: this.urlParams.adName,
      fb_click_id: this.urlParams.fbClickId,
      
      // Confirmation page data
      confirmation_choice: this.getChoiceEnglish(this.userSelections.choice || this.selectedChoice),
      cancellation_reasons: this.getCancellationReasonsEnglish(this.userSelections.cancellationReasons || this.selectedCancellationReasons),
      subscription_preference: this.userSelections.subscription || this.selectedSubscription,
      preferred_start_time: this.getStartTimeEnglish(this.userSelections.startTime || this.selectedStartTime),
      payment_access: this.getPaymentEnglish(this.userSelections.payment || this.selectedPayment),
      
      // Session tracking data
      session_id: this.sessionId,
      trigger: trigger,
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      
      // Form interaction data
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: this.formStarted && this.formStartTime > 0 ? Math.round((Date.now() - this.formStartTime) / 1000) : 0
    };

    // Console logging for debugging with better formatting
    console.log('📊 TRACKING DATA SENT:');
    console.log('Trigger:', trigger);
    console.log('Session ID:', this.sessionId);
    console.log('Events:', JSON.stringify(events, null, 2));
    console.log('Zapier Data:', JSON.stringify(zapierData, null, 2));

    // Send to Zapier webhook
    this.sendToZapier(zapierData);
    
    // TODO: Send to Hotjar
    // this.sendToHotjar(events);
  }

  // New method using the successful Zapier service pattern
  private async sendFormDataToZapier() {
    // In development mode, just log the data without making API calls
    if (this.isDevelopment) {
      console.log('🔧 Development mode: Logging form data (no Zapier API call)');
      console.log('📊 Form data that would be sent:');
      console.log(JSON.stringify({
        selectedResponse: this.selectedChoice,
        cancelReasons: this.selectedCancellationReasons,
        marketingConsent: this.selectedSubscription,
        preferredStartTime: this.selectedStartTime,
        paymentReadiness: this.selectedPayment,
        otherReason: this.otherCancellationReason,
        name: this.urlParams.name,
        email: this.urlParams.email,
        campaignName: this.urlParams.campaignName,
        adsetName: this.urlParams.adsetName,
        adName: this.urlParams.adName,
        fbClickId: this.urlParams.fbClickId
      }, null, 2));
      return;
    }
    
    try {
      // Calculate form interaction time
      let formInteractionTime = 0;
      if (this.formStarted && this.formStartTime > 0) {
        formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
      }

      // Prepare events data (convert to seconds)
      const events = {
        session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
        session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
        session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
        session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
        session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
        session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
        session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
        session_idle_time_duration: Math.round(this.idleTime.total / 1000),
        form_started: this.formStarted,
        form_submitted: this.formSubmitted,
        form_interaction_time: formInteractionTime
      };

      // Prepare form data in the successful format with analytics
      const formData: FormData = {
        selectedResponse: this.getChoiceEnglish(this.selectedChoice),
        cancelReasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
        marketingConsent: this.selectedSubscription,
        englishImpact: 'Not Applicable', // This form doesn't have English impact question
        preferredStartTime: this.getStartTimeEnglish(this.selectedStartTime),
        paymentReadiness: this.getPaymentEnglish(this.selectedPayment),
        pricingResponse: this.selectedPlan || 'Not Selected',
        name: this.urlParams.name,
        email: this.urlParams.email,
        campaignName: this.urlParams.campaignName,
        adsetName: this.urlParams.adsetName,
        adName: this.urlParams.adName,
        fbClickId: this.urlParams.fbClickId,
        // Analytics data
        sessionId: this.sessionId,
        trigger: 'form_submission',
        timestamp: new Date().toISOString(),
        totalSessionTime: Math.round((Date.now() - this.sessionStartTime) / 1000),
        events: events,
        userAgent: navigator.userAgent,
        pageUrl: window.location.href,
        formStarted: this.formStarted,
        formSubmitted: this.formSubmitted,
        formInteractionTime: formInteractionTime
      };

      console.log('📤 Sending form data with analytics to Zapier:', formData);
      
      // Send using the new service
      const response = await this.zapierService.sendToZapier(formData);
      console.log('✅ Successfully sent to Zapier:', response);
      
    } catch (error) {
      console.error('❌ Error sending to Zapier:', error);
      console.log('⚠️ Continuing without Zapier integration...');
      // Don't throw error, just log it so the app continues to work
    }
  }

  // Keep the old method for backward compatibility with tracking data
  private sendToZapier(data: any) {
    // In development mode, just log the data without making API calls
    if (this.isDevelopment) {
      console.log('🔧 Development mode: Logging analytics data (no Zapier API call)');
      console.log('📊 Analytics data that would be sent:');
      console.log(JSON.stringify(data, null, 2));
      return;
    }
    
    // Try multiple webhook URLs - use the one from the service that might work better
    const webhookUrls = [
      'https://hooks.zapier.com/hooks/catch/4630879/umnnybh/', // From ZapierService
      'https://hooks.zapier.com/hooks/catch/4630879/umnemeo/', // Original URL
      'https://hooks.zapier.com/hooks/catch/4630879/umn6x4s/'  // Backup URL
    ];
    
    // Log the data being sent for debugging
    console.log('📤 Attempting to send data to Zapier:', data);
    
    // Try each webhook URL until one works
    this.tryZapierWebhooks(webhookUrls, data, 0);
  }

  private tryZapierWebhooks(urls: string[], data: any, index: number) {
    if (index >= urls.length) {
      console.error('❌ All Zapier webhook URLs failed');
      return;
    }

    const currentUrl = urls[index];
    console.log(`🔗 Trying webhook URL ${index + 1}/${urls.length}:`, currentUrl);
    
    // Send data to Zapier webhook as JSON with better error handling
    fetch(currentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data),
      mode: 'cors'
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ Successfully sent to Zapier:', data);
        console.log('📊 Data sent as JSON:', JSON.stringify(data, null, 2));
        console.log('🔗 Webhook URL used:', currentUrl);
        console.log('📋 Response status:', response.status);
        console.log('📋 Response headers:', response.headers);
      } else {
        console.error(`❌ Failed to send to Zapier (URL ${index + 1}):`, response.status, response.statusText);
        // Try the next URL
        this.tryZapierWebhooks(urls, data, index + 1);
      }
    })
    .catch(error => {
      console.error(`❌ Error sending to Zapier (URL ${index + 1}):`, error);
      // Try the next URL
      this.tryZapierWebhooks(urls, data, index + 1);
    });
  }

  private sendLeadUpdateToZapier() {
    // Calculate form interaction time
    let formInteractionTime = 0;
    if (this.formStarted && this.formStartTime > 0) {
      formInteractionTime = Math.round((Date.now() - this.formStartTime) / 1000);
    }

    // Prepare events data (convert to seconds)
    const events = {
      session_duration_on_price_section: Math.round((this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000),
      session_duration_on_levels_section: Math.round((this.sectionTimers['#levels-section']?.totalTime || 0) / 1000),
      session_duration_on_teachers_section: Math.round((this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000),
      session_duration_on_platform_section: Math.round((this.sectionTimers['#platform-section']?.totalTime || 0) / 1000),
      session_duration_on_advisors_section: Math.round((this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000),
      session_duration_on_testimonials_section: Math.round((this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000),
      session_duration_on_form_section: Math.round((this.sectionTimers['#form-section']?.totalTime || 0) / 1000),
      session_idle_time_duration: Math.round(this.idleTime.total / 1000),
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare lead update data with full analytics
    const leadUpdateData = {
      // Lead identification
      email: this.urlParams.email,
      name: this.urlParams.name,
      
      // Campaign data
      campaign_name: this.urlParams.campaignName,
      adset_name: this.urlParams.adsetName,
      ad_name: this.urlParams.adName,
      fb_click_id: this.urlParams.fbClickId,
      
      // Confirmation responses
      confirmation_status: this.selectedChoice === 'confirm' ? 'Confirmed Interest' : 'Cancelled',
      choice: this.selectedChoice,
      
      // Detailed responses
      cancellation_reasons: this.getCancellationReasonsEnglish(this.selectedCancellationReasons),
      subscription_opt_in: this.selectedSubscription,
      preferred_start_time: this.getStartTimeEnglish(this.selectedStartTime),
      payment_method_available: this.getPaymentEnglish(this.selectedPayment),
      
      // Analytics data
      session_id: this.sessionId,
      trigger: 'form_submission_start',
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    console.log('📋 LEAD UPDATE DATA:', leadUpdateData);
    
    // Send to Zapier (you'll need to replace the URL)
    this.sendToZapier(leadUpdateData);
  }

  private sendToHotjar(events: any) {
    // This will be implemented when Hotjar is set up
    console.log('🔥 Would send to Hotjar:', events);
  }

  onImageError(event: any) {
    console.error('Image failed to load:', event.target.src);
    console.error('Error details:', event);
    // You can add fallback image logic here if needed
  }

  onImageLoad(event: any) {
    console.log('Image loaded successfully:', event.target.src);
    console.log('Image dimensions:', event.target.naturalWidth, 'x', event.target.naturalHeight);
  }

  // Checkbox handling
  onCancellationReasonChange(reason: string, isChecked: boolean) {
    if (isChecked) {
      this.selectedCancellationReasons.push(reason);
    } else {
      this.selectedCancellationReasons = this.selectedCancellationReasons.filter(r => r !== reason);
    }
  }

  isCancellationReasonSelected(reason: string): boolean {
    return this.selectedCancellationReasons.includes(reason);
  }

  // Radio button handling
  onSubscriptionChange(value: string) {
    this.selectedSubscription = value;
  }

  onStartTimeChange(value: string) {
    this.selectedStartTime = value;
  }

  onPaymentChange(value: string) {
    this.selectedPayment = value;
  }

  // Modal methods
  openModal(imageSrc: string) {
    this.modalImageSrc = imageSrc;
    this.showModal = true;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.isTouching = false;
    this.initialTouchDistance = 0;
    this.initialZoomLevel = 1;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showModal = false;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.isTouching = false;
    this.initialTouchDistance = 0;
    this.initialZoomLevel = 1;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  zoomIn() {
    if (this.zoomLevel < 5) {
      this.zoomLevel += 0.25;
    }
  }

  zoomOut() {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.25;
      // Reset pan when zooming out to fit
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  // Wheel zoom
  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.5, Math.min(5, this.zoomLevel + delta));
    
    if (newZoom !== this.zoomLevel) {
      this.zoomLevel = newZoom;
      // Reset pan when zooming out to fit
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  // Mouse drag for panning
  onMouseDown(event: MouseEvent) {
    if (this.zoomLevel > 1) {
      this.isDragging = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    }
  }

  onMouseMove(event: MouseEvent) {
    if (this.isDragging && this.zoomLevel > 1) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;
      
      this.panX += deltaX;
      this.panY += deltaY;
      
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      event.preventDefault();
    }
  }

  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
  }

  // Click to zoom in (only when not dragging)
  onImageClick(event: MouseEvent) {
    if (!this.isDragging && this.zoomLevel === 1) {
      this.zoomIn();
    }
  }

  // Touch to zoom in (only when not touching and at default zoom)
  onImageTouchStart(event: TouchEvent) {
    if (!this.isTouching && this.zoomLevel === 1 && event.touches.length === 1) {
      // Single tap to zoom in
      setTimeout(() => {
        if (!this.isTouching) {
          this.zoomIn();
        }
      }, 100);
    }
  }

  // Touch event handlers
  onTouchStart(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1) {
      // Single touch - start panning
      this.isTouching = true;
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2) {
      // Two touches - start pinch zoom
      this.isTouching = true;
      this.initialTouchDistance = this.getTouchDistance(touches[0], touches[1]);
      this.initialZoomLevel = this.zoomLevel;
    }
  }

  onTouchMove(event: TouchEvent) {
    event.preventDefault();
    const touches = event.touches;
    
    if (touches.length === 1 && this.isTouching && this.zoomLevel > 1) {
      // Single touch - panning
      const deltaX = touches[0].clientX - this.lastTouchX;
      const deltaY = touches[0].clientY - this.lastTouchY;
      
      this.panX += deltaX;
      this.panY += deltaY;
      
      this.lastTouchX = touches[0].clientX;
      this.lastTouchY = touches[0].clientY;
    } else if (touches.length === 2 && this.isTouching) {
      // Two touches - pinch zoom
      const currentDistance = this.getTouchDistance(touches[0], touches[1]);
      const scale = currentDistance / this.initialTouchDistance;
      const newZoom = Math.max(0.5, Math.min(5, this.initialZoomLevel * scale));
      
      this.zoomLevel = newZoom;
      
      // Reset pan when zooming out to fit
      if (this.zoomLevel <= 1) {
        this.panX = 0;
        this.panY = 0;
      }
    }
  }

  onTouchEnd(event: TouchEvent) {
    this.isTouching = false;
    this.initialTouchDistance = 0;
    this.initialZoomLevel = 1;
  }

  // Helper method to calculate distance between two touch points
  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }


  // Pricing section timer methods
  startPricingTimer() {
    if (this.pricingSectionVisible && this.pricingStartTime === 0) {
      this.pricingStartTime = Date.now();
      console.log('Started pricing timer at:', new Date(this.pricingStartTime));
    }
    
    // Keep the original popup logic
    if (!this.hasShownPricingPopup && this.pricingSectionVisible) {
      this.pricingTimer = setTimeout(() => {
        if (this.pricingSectionVisible && !this.hasShownPricingPopup) {
          this.showPricingPopup = true;
          this.hasShownPricingPopup = true;
          // Prevent body scroll when popup is open
          document.body.style.overflow = 'hidden';
        }
      }, 20000); // 20 seconds
    }
  }

  stopPricingTimer() {
    if (this.pricingStartTime > 0) {
      this.pricingEndTime = Date.now();
      const sessionTime = this.pricingEndTime - this.pricingStartTime;
      this.totalPricingTime += sessionTime;
      console.log('Stopped pricing timer. Session time:', sessionTime, 'ms. Total time:', this.totalPricingTime, 'ms');
      this.pricingStartTime = 0; // Reset for next session
    }
    
    // Keep the original timer clearing logic
    if (this.pricingTimer) {
      clearTimeout(this.pricingTimer);
      this.pricingTimer = null;
    }
  }

  closePricingPopup() {
    this.showPricingPopup = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  onPlanSelect(plan: string) {
    // Capture the selected plan
    this.selectedPlan = plan;
    
    // Calculate section view time in seconds
    const sectionViewTimeMs = this.pricingStartTime > 0 ? Date.now() - this.pricingStartTime : 0;
    const sectionViewTime = Math.round(sectionViewTimeMs / 1000); // Convert to seconds
    
    // Prepare form data for future submission
    this.planSelectionData = {
      plan: plan,
      timestamp: new Date().toISOString(),
      sectionViewTime: sectionViewTime,
      userAgent: navigator.userAgent,
      pageUrl: window.location.href,
      formType: 'pricing_plan_selection'
    };
    
    // Log the captured data (for now)
    console.log('Plan Selection Form Data:', this.planSelectionData);
    
    // TODO: Send data to your backend/analytics service
    // this.sendPlanSelectionData(this.planSelectionData);
    
    this.closePricingPopup();
  }

  // Future method to send data (ready for implementation)
  private sendPlanSelectionData(data: any) {
    // This method is ready for when you want to send the data
    // Example implementations:
    
    // Option 1: Send to your backend API
    // return this.http.post('/api/plan-selection', data).subscribe();
    
    // Option 2: Send to analytics service
    // gtag('event', 'plan_selection', data);
    
    // Option 3: Send to CRM
    // this.crmService.trackPlanSelection(data);
    
    console.log('Data ready to be sent:', data);
  }

  // Verification page methods
  closeVerificationPage() {
    this.showVerificationPage = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  onNameChange(name: string) {
    this.userSelections.name = name;
  }

  proceedToWhatsApp() {
    // Debug: Log name before processing
    console.log('🔍 proceedToWhatsApp name debug:', {
      urlParamsName: this.urlParams.name,
      userSelectionsName: this.userSelections.name
    });
    
    // Name is automatically filled from URL parameters, so we don't need to validate it
    // If no name from URL, use a default
    if (!this.userSelections.name || !this.userSelections.name.trim()) {
      this.userSelections.name = this.urlParams.name || 'عميل';
      console.log('🔧 Name fallback applied:', this.userSelections.name);
    }

    // Send form data using the new successful Zapier service
    this.sendFormDataToZapier();

    // Send analytics data for final action (keep existing tracking)
    this.sendLeadUpdateToZapier();

    // Handle cancellation - show thanks message instead of WhatsApp
    if (this.userSelections.choice === 'cancel') {
      this.closeVerificationPage();
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      this.resetFormValues(); // Reset form after submission
      return;
    }

    // Handle confirmation - always go to WhatsApp
    if (this.userSelections.choice === 'confirm') {
      // Always go to WhatsApp for confirmations (regardless of payment method)
      this.goToWhatsApp();
      this.resetFormValues(); // Reset form after submission
    }
  }

  private goToWhatsApp() {
    // Use name directly from URL parameters
    const nameFromUrl = this.urlParams.name || 'عميل';
    
    console.log('🔍 WhatsApp name from URL:', nameFromUrl);
    
    // Generate personalized message using the new Arabic template
    const message = `مرحباً هالة، 👋
 أتمنى أن تكوني بخير
 اسمي ${nameFromUrl} وقد أكدتُ رغبتي في حضور دروس اللغة الإنجليزية. أرجو مساعدتي في إكمال عملية التسجيل 📝`;

    // Hala's WhatsApp number: +1 (647) 365-4860
    const halaNumber = '16473654860'; // Remove spaces and special characters
    const whatsappUrl = `https://wa.me/${halaNumber}?text=${encodeURIComponent(message)}`;
    
    // Close verification page and open WhatsApp
    this.closeVerificationPage();
    window.open(whatsappUrl, '_blank');
  }

  private showThanksMessage(isCancellation: boolean = false) {
    // Try to send form data using the new successful Zapier service
    // Wrap in try-catch to prevent errors from breaking the UI
    try {
      this.sendFormDataToZapier();
      this.sendLeadUpdateToZapier();
    } catch (error) {
      console.error('⚠️ Zapier integration failed, continuing with UI:', error);
    }
    
    // Check if this is a cancellation to show success page
    if (isCancellation || this.selectedChoice === 'cancel') {
      this.showCancellationSuccess = true;
    } else {
      // Show thanks message modal for other cases
      this.showThanksModal = true;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      // Reset form values after showing thanks message
      this.resetFormValues();
    }
  }

  getCancellationReasonText(reason: string): string {
    const reasons: { [key: string]: string } = {
      'Price': 'السعر مرتفع جداً',
      'Timing': 'الجداول الزمنية غير مناسبة',
      'Schedule': 'جدول أعمالي لا يسمح',
      'Payment': 'شكوك بشأن أمان الدفع',
      'Prefer Inperson': 'أفضل الدروس الحضورية',
      'other': 'سبب آخر'
    };
    return reasons[reason] || reason;
  }

  getStartTimeText(startTime: string): string {
    const times: { [key: string]: string } = {
      'now': 'الآن',
      'nextWeek': 'الأسبوع القادم',
      'nextMonth': 'الشهر القادم',
      'comingMonths': 'خلال الأشهر القادمة'
    };
    return times[startTime] || startTime;
  }

  getPaymentText(payment: string): string {
    const payments: { [key: string]: string } = {
      'yesUsed': 'أستطيع الوصول إلى طرق الدفع',
      'noNoHelp': 'لا أستطيع الوصول إلى طرق الدفع'
    };
    return payments[payment] || payment;
  }

  // Convert technical values to readable English for Zapier submission
  getStartTimeEnglish(startTime: string): string {
    const times: { [key: string]: string } = {
      'now': 'Now',
      'nextWeek': 'Next Week',
      'nextMonth': 'Next Month',
      'comingMonths': 'Coming Months'
    };
    return times[startTime] || startTime;
  }

  getPaymentEnglish(payment: string): string {
    const payments: { [key: string]: string } = {
      'yesUsed': 'Yes, I am able to access payment methods',
      'noNoHelp': 'No, I am not able to access payment methods'
    };
    return payments[payment] || payment;
  }

  getChoiceEnglish(choice: string): string {
    const choices: { [key: string]: string } = {
      'confirm': 'Confirm Interest',
      'cancel': 'Cancel'
    };
    return choices[choice] || choice;
  }

  getCancellationReasonsEnglish(reasons: string[]): string[] {
    const reasonMap: { [key: string]: string } = {
      'price': 'Price is too high',
      'timing': 'Timing is not suitable',
      'schedule': 'My schedule does not allow',
      'payment': 'Doubts about payment security',
      'prefer-inperson': 'I prefer in-person lessons',
      'other': 'Other reason'
    };
    
    return reasons.map(reason => reasonMap[reason] || reason);
  }

  // Validation methods
  showValidationErrorModal(message: string) {
    this.validationMessage = message;
    this.showValidationError = true;
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }

  closeValidationError() {
    this.showValidationError = false;
    this.validationMessage = '';
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  validateName() {
    const name = this.userSelections.name?.trim() || '';
    if (!name) {
      this.nameError = true;
      this.nameErrorMessage = 'الاسم مطلوب';
    } else if (name.length < 2) {
      this.nameError = true;
      this.nameErrorMessage = 'الاسم يجب أن يكون على الأقل حرفين';
    } else {
      this.nameError = false;
      this.nameErrorMessage = '';
    }
  }

  clearNameError() {
    this.nameError = false;
    this.nameErrorMessage = '';
  }

  closeThanksModal() {
    this.showThanksModal = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  // Close cancellation success modal and reset form
  closeCancellationSuccess() {
    this.showCancellationSuccess = false;
    this.resetFormValues();
  }


  // Pricing time validation methods
  closePricingTimeValidation() {
    this.showPricingTimeValidation = false;
    // Restore body scroll
    document.body.style.overflow = 'auto';
  }

  proceedWithoutCheckingPrices() {
    this.closePricingTimeValidation();
    // Continue with the original form submission logic
    this.continueWithFormSubmission();
  }

  goBackToCheckPrices() {
    this.closePricingTimeValidation();
    // Scroll to pricing section
    const pricingSection = document.querySelector('#pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    }
  }

  private continueWithFormSubmission() {
    // Mark form as submitted when user starts the submission process
    this.formSubmitted = true;
    console.log('✅ Form submitted - User completed the form');
    
    // Send lead update data to Zapier
    this.sendLeadUpdateToZapier();
    
    // Send tracking data when form submission starts
    this.sendTrackingData('form_submission_start');
    
    // If user cancels, show thanks message directly
    if (this.selectedChoice === 'cancel') {
      this.showThanksMessage(true); // Pass true to indicate this is a cancellation
      this.resetFormValues(); // Reset form after submission
      return;
    }
    
    // For confirmations, collect all user selections and show verification page
    this.userSelections = {
      choice: this.selectedChoice,
      cancellationReasons: this.selectedCancellationReasons,
      subscription: this.selectedSubscription,
      startTime: this.selectedStartTime,
      payment: this.selectedPayment,
      name: this.urlParams.name || '' // Use name from URL parameters
    };
    
    // Show verification page
    this.showVerificationPage = true;
    // Prevent body scroll when verification page is open
    document.body.style.overflow = 'hidden';
  }

  // Reset all form values to their default state
  private resetFormValues() {
    this.selectedChoice = '';
    this.selectedCancellationReasons = [];
    this.selectedSubscription = '';
    this.selectedStartTime = '';
    this.selectedPayment = '';
    this.selectedPlan = '';
    this.otherCancellationReason = '';
    
    // Reset user selections
    this.userSelections = {
      choice: '',
      cancellationReasons: [],
      subscription: '',
      startTime: '',
      payment: '',
      name: ''
    };
    
    // Reset form state
    this.formStarted = false;
    this.formSubmitted = false;
    this.formStartTime = 0;
    
    // Reset modal states
    this.showCancellationSuccess = false;
    this.showThanksModal = false;
    
    console.log('🔄 Form values reset to default state');
  }
}
