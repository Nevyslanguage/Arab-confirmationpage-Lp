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
  }

  onWhatsAppClick() {
    if (this.selectedChoice) {
      // Check if user spent enough time on pricing section (5 seconds = 5000ms)
      const totalTimeInSeconds = this.totalPricingTime / 1000;
      console.log('Total time spent on pricing section:', totalTimeInSeconds, 'seconds');
      
      if (totalTimeInSeconds < 5) {
        // Show validation dialog asking if they checked prices
        this.showPricingTimeValidation = true;
        document.body.style.overflow = 'hidden';
        return;
      }
      
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
    this.setupIntersectionObservers();
  }

  ngOnDestroy() {
    // No auto-play to stop
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

  // Intersection Observer setup
  setupIntersectionObservers() {
    // Pricing section observer
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

    // Observe elements after view init
    setTimeout(() => {
      const pricingSection = document.querySelector('#pricing-section');
      
      if (pricingSection) {
        pricingObserver.observe(pricingSection);
      }
    }, 100);
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
    if (!this.userSelections.name.trim()) {
      this.showValidationErrorModal('يرجى إدخال اسمك أولاً');
      return;
    }

    if (this.userSelections.name.trim().length < 2) {
      this.showValidationErrorModal('الاسم يجب أن يكون على الأقل حرفين');
      return;
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
    // Generate personalized message based on selections
    let message = `مرحباً، أنا ${this.userSelections.name}\n\n`;
    
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
  }
}
