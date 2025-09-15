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
  private autoPlayInterval: any;
  
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
  private hasShownPricingPopup: boolean = false;
  private pricingSectionVisible: boolean = false;
  private carouselVisible: boolean = false;
  
  // Plan selection data
  selectedPlan: string = '';
  planSelectionData: any = {
    plan: '',
    timestamp: '',
    sectionViewTime: 0,
    userAgent: '',
    pageUrl: ''
  };

  onChoiceChange(choice: string) {
    this.selectedChoice = choice;
  }

  onWhatsAppClick() {
    if (this.selectedChoice) {
      const message = this.selectedChoice === 'cancel' 
        ? 'أريد إلغاء موعدي' 
        : 'أريد تأكيد اهتمامي بدورات اللغة الإنجليزية';
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      alert('يرجى اختيار أحد الخيارات أولاً');
    }
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    console.log('Next slide:', this.currentSlide);
  }

  previousSlide() {
    this.currentSlide = this.currentSlide === 0 ? this.slides.length - 1 : this.currentSlide - 1;
    console.log('Previous slide:', this.currentSlide);
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    console.log('Go to slide:', this.currentSlide);
  }

  ngOnInit() {
    this.startAutoPlay();
    this.setupIntersectionObservers();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => {
      if (this.carouselVisible) {
        this.nextSlide();
      }
    }, 3000); // Change slide every 3 seconds
  }

  stopAutoPlay() {
    if (this.autoPlayInterval) {
      clearInterval(this.autoPlayInterval);
    }
  }

  // Pause auto-play when user interacts
  onSlideInteraction() {
    this.stopAutoPlay();
    // Restart auto-play after 5 seconds of inactivity
    setTimeout(() => {
      this.startAutoPlay();
    }, 5000);
  }

  onImageError(event: any) {
    console.error('Image failed to load:', event.target.src);
    // You can add fallback image logic here if needed
  }

  onImageLoad(event: any) {
    console.log('Image loaded successfully:', event.target.src);
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

    // Carousel observer
    const carouselObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        this.carouselVisible = entry.isIntersecting;
      });
    }, { threshold: 0.5 });

    // Observe elements after view init
    setTimeout(() => {
      const pricingSection = document.querySelector('#pricing-section');
      const carouselSection = document.querySelector('#carousel-section');
      
      if (pricingSection) {
        pricingObserver.observe(pricingSection);
      }
      if (carouselSection) {
        carouselObserver.observe(carouselSection);
      }
    }, 100);
  }

  // Pricing section timer methods
  startPricingTimer() {
    if (!this.hasShownPricingPopup && this.pricingSectionVisible) {
      this.pricingStartTime = Date.now();
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
}
