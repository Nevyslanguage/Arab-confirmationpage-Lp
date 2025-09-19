import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirmation-page',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './confirmation-page.component.html',
  styleUrl: './confirmation-page.component.css'
})
export class ConfirmationPageComponent implements OnInit, OnDestroy {
  selectedChoice: string = '';
  currentSlide: number = 0;
  slides = [0, 1, 2, 3]; // Four review images
  
  // Form selections
  selectedCancellationReasons: string[] = [];
  selectedSubscription: string = '';
  selectedStartTime: string = '';
  selectedPayment: string = '';

  // Modal properties
  showModal: boolean = false;
  modalImageSrc: string = '';
  zoomLevel: number = 1;
  panX: number = 0;
  panY: number = 0;
  isDragging: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;

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
    if (this.selectedChoice) {
      // Check if user spent enough time on pricing section (5 seconds = 5000ms)
      const totalTimeInSeconds = this.totalPricingTime / 1000;
      console.log('Total time spent on pricing section:', totalTimeInSeconds, 'seconds');
      
      // if (totalTimeInSeconds < 5) {
      //   // Show validation dialog asking if they checked prices
      //   this.showPricingTimeValidation = true;
      //   document.body.style.overflow = 'hidden';
      //   return;
      // }
      
      // If user cancels, show thanks message directly
      if (this.selectedChoice === 'cancel') {
        this.showThanksMessage();
        return;
      }
      
      // For confirmations, collect all user selections and show verification page
      this.userSelections = {
        choice: this.selectedChoice,
        cancellationReasons: this.selectedCancellationReasons,
        subscription: this.selectedSubscription,
        startTime: this.selectedStartTime,
        payment: this.selectedPayment,
        name: '' // Will be filled in verification page
      };
      
      // Show verification page
      this.showVerificationPage = true;
      // Prevent body scroll when verification page is open
      document.body.style.overflow = 'hidden';
    } else {
      alert('يرجى اختيار أحد الخيارات أولاً');
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
    // Send tracking data before component is destroyed
    this.sendTrackingData('component_destroy');
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
      session_duration_on_price_section: Math.round(this.sectionTimers['#pricing-section']?.totalTime || 0) / 1000,
      session_duration_on_levels_section: Math.round(this.sectionTimers['#levels-section']?.totalTime || 0) / 1000,
      session_duration_on_teachers_section: Math.round(this.sectionTimers['#teachers-section']?.totalTime || 0) / 1000,
      session_duration_on_platform_section: Math.round(this.sectionTimers['#platform-section']?.totalTime || 0) / 1000,
      session_duration_on_advisors_section: Math.round(this.sectionTimers['#consultants-section']?.totalTime || 0) / 1000,
      session_duration_on_testimonials_section: Math.round(this.sectionTimers['#carousel-section']?.totalTime || 0) / 1000,
      session_duration_on_form_section: Math.round(this.sectionTimers['#form-section']?.totalTime || 0) / 1000,
      session_idle_time_duration: Math.round(this.idleTime.total) / 1000,
      form_started: this.formStarted,
      form_submitted: this.formSubmitted,
      form_interaction_time: formInteractionTime
    };

    // Prepare Zapier webhook data
    const zapierData = {
      session_id: this.sessionId,
      trigger: trigger,
      timestamp: new Date().toISOString(),
      total_session_time: Math.round((Date.now() - this.sessionStartTime) / 1000),
      events: events,
      user_agent: navigator.userAgent,
      page_url: window.location.href,
      // User data from URL parameters
      user_name: this.urlParams.name,
      user_email: this.urlParams.email
    };

    // Console logging for debugging
    console.log('📊 TRACKING DATA SENT:', {
      trigger: trigger,
      sessionId: this.sessionId,
      events: events,
      zapierData: zapierData
    });

    // Send to Zapier webhook
    this.sendToZapier(zapierData);
    
    // TODO: Send to Hotjar
    // this.sendToHotjar(events);
  }

  private sendToZapier(data: any) {
    // Replace this URL with your actual Zapier webhook URL
    const zapierWebhookUrl = 'YOUR_ZAPIER_WEBHOOK_URL_HERE';
    
    if (zapierWebhookUrl === 'YOUR_ZAPIER_WEBHOOK_URL_HERE') {
      console.log('⚠️ Please update the Zapier webhook URL in the code');
      console.log('🔗 Would send to Zapier:', data);
      return;
    }
    
    // Send data to Zapier webhook
    fetch(zapierWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (response.ok) {
        console.log('✅ Successfully sent to Zapier:', data);
      } else {
        console.error('❌ Failed to send to Zapier:', response.status, response.statusText);
      }
    })
    .catch(error => {
      console.error('❌ Error sending to Zapier:', error);
    });
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
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  closeModal() {
    this.showModal = false;
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
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

    // Handle cancellation - show thanks message instead of WhatsApp
    if (this.userSelections.choice === 'cancel') {
      this.closeVerificationPage();
      this.showThanksMessage();
      return;
    }

    // Handle confirmation - check payment method
    if (this.userSelections.choice === 'confirm') {
      // Only go to WhatsApp if user has payment method
      if (this.userSelections.payment === 'yesUsed') {
        this.goToWhatsApp();
      } else {
        // Show thanks message if no payment method
        this.closeVerificationPage();
        this.showThanksMessage();
        return;
      }
    }
  }

  private goToWhatsApp() {
    // Use name directly from URL parameters
    const nameFromUrl = this.urlParams.name || 'عميل';
    
    console.log('🔍 WhatsApp name from URL:', nameFromUrl);
    
    // Generate personalized message based on selections
    let message = `مرحباً، أنا ${nameFromUrl}\n\n`;
    
    message += 'أريد تأكيد اهتمامي بدورات اللغة الإنجليزية.\n';
    if (this.userSelections.startTime) {
      message += `متى أريد البدء: ${this.getStartTimeText(this.userSelections.startTime)}\n`;
    }
    if (this.userSelections.payment) {
      message += `حالة الدفع: ${this.getPaymentText(this.userSelections.payment)}`;
    }

    // Hala's WhatsApp number: +1 (647) 365-4860
    const halaNumber = '16473654860'; // Remove spaces and special characters
    const whatsappUrl = `https://wa.me/${halaNumber}?text=${encodeURIComponent(message)}`;
    
    // Close verification page and open WhatsApp
    this.closeVerificationPage();
    window.open(whatsappUrl, '_blank');
  }

  private showThanksMessage() {
    // Show thanks message modal
    this.showThanksModal = true;
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  getCancellationReasonText(reason: string): string {
    const reasons: { [key: string]: string } = {
      'price': 'السعر مرتفع جداً',
      'timing': 'الجداول الزمنية غير مناسبة',
      'schedule': 'جدول أعمالي لا يسمح',
      'payment': 'شكوك بشأن أمان الدفع',
      'prefer-inperson': 'أفضل الدروس الحضورية',
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
    
    // Send tracking data when form submission starts
    this.sendTrackingData('form_submission_start');
    
    // If user cancels, show thanks message directly
    if (this.selectedChoice === 'cancel') {
      this.showThanksMessage();
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
}
