import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormData {
  selectedResponse: string;
  cancelReasons: string[];
  marketingConsent: string;
  englishImpact: string;
  preferredStartTime: string;
  paymentReadiness: string;
  pricingResponse: string;
  name?: string;
  email?: string;
  campaignName?: string;
  adsetName?: string;
  adName?: string;
  fbClickId?: string;
  // Analytics data
  sessionId?: string;
  trigger?: string;
  timestamp?: string;
  totalSessionTime?: number;
  events?: any;
  userAgent?: string;
  pageUrl?: string;
  formStarted?: boolean;
  formSubmitted?: boolean;
  formInteractionTime?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZapierService {
  // Your actual Zapier webhook URL - UPDATE THIS WITH YOUR NEW WEBHOOK URL
  private readonly ZAPIER_WEBHOOK_URL = 'https://hooks.zapier.com/hooks/catch/4630879/YOUR_NEW_WEBHOOK_ID/';

  constructor(private http: HttpClient) {}

  // Send form data to Zapier webhook
  async sendToZapier(formData: FormData): Promise<any> {
    try {
      // Create URL parameters for the webhook
      const params = new URLSearchParams();
      
      // Basic lead information
      params.set('first_name', formData.name || 'Prospect');
      params.set('last_name', 'Nevys');
      params.set('company', 'Nevy\'s Language Prospect');
      params.set('lead_source', 'Website Confirmation Page');
      params.set('status', 'New');
      
      // Form responses
      params.set('response_type', formData.selectedResponse);
      params.set('cancel_reasons', formData.cancelReasons.join(', '));
      params.set('marketing_consent', formData.marketingConsent);
      params.set('english_impact', formData.englishImpact);
      params.set('preferred_start_time', formData.preferredStartTime);
      params.set('payment_readiness', formData.paymentReadiness);
      params.set('pricing_response', formData.pricingResponse);
      
      // Campaign tracking data
      if (formData.email) params.set('email', formData.email);
      if (formData.campaignName) params.set('campaign_name', formData.campaignName);
      if (formData.adsetName) params.set('adset_name', formData.adsetName);
      if (formData.adName) params.set('ad_name', formData.adName);
      if (formData.fbClickId) params.set('fb_click_id', formData.fbClickId);
      
      // Analytics data
      if (formData.sessionId) params.set('session_id', formData.sessionId);
      if (formData.trigger) params.set('trigger', formData.trigger);
      if (formData.totalSessionTime) params.set('total_session_time', formData.totalSessionTime.toString());
      if (formData.formStarted !== undefined) params.set('form_started', formData.formStarted.toString());
      if (formData.formSubmitted !== undefined) params.set('form_submitted', formData.formSubmitted.toString());
      if (formData.formInteractionTime) params.set('form_interaction_time', formData.formInteractionTime.toString());
      
      // Events data (convert to JSON string for URL parameter)
      if (formData.events) {
        params.set('events', JSON.stringify(formData.events));
      }
      
      // Additional metadata
      params.set('submission_date', new Date().toISOString());
      params.set('source_url', window.location.href);
      if (formData.userAgent) params.set('user_agent', formData.userAgent);
      if (formData.pageUrl) params.set('page_url', formData.pageUrl);
      
      // Formatted description for Salesforce
      params.set('description', this.formatFormDataForDescription(formData));

      // Send as GET request with query parameters
      const response = await this.http.get(`${this.ZAPIER_WEBHOOK_URL}?${params.toString()}`).toPromise();
      return response;
    } catch (error) {
      console.error('Error sending to Zapier:', error);
      throw error;
    }
  }

  // Format form data into a readable description
  private formatFormDataForDescription(formData: FormData): string {
    let description = `Confirmation Page Form Submission Details:\n\n`;
    
    description += `Response: ${formData.selectedResponse}\n`;
    
    if (formData.cancelReasons && formData.cancelReasons.length > 0) {
      description += `Cancel Reasons: ${formData.cancelReasons.join(', ')}\n`;
    }
    
    if (formData.marketingConsent) {
      description += `Marketing Consent: ${formData.marketingConsent}\n`;
    }
    
    if (formData.englishImpact) {
      description += `English Impact Level: ${formData.englishImpact}\n`;
    }
    
    if (formData.preferredStartTime) {
      description += `Preferred Start Time: ${formData.preferredStartTime}\n`;
    }
    
    if (formData.paymentReadiness) {
      description += `Payment Readiness: ${formData.paymentReadiness}\n`;
    }
    
    if (formData.pricingResponse) {
      description += `Pricing Feedback: ${formData.pricingResponse}\n`;
    }
    
    if (formData.name) {
      description += `Name: ${formData.name}\n`;
    }
    
    if (formData.email) {
      description += `Email: ${formData.email}\n`;
    }
    
    // Campaign tracking
    if (formData.campaignName) {
      description += `Campaign: ${formData.campaignName}\n`;
    }
    
    if (formData.adsetName) {
      description += `Adset: ${formData.adsetName}\n`;
    }
    
    if (formData.adName) {
      description += `Ad: ${formData.adName}\n`;
    }
    
    // Analytics data
    if (formData.sessionId) {
      description += `Session ID: ${formData.sessionId}\n`;
    }
    
    if (formData.totalSessionTime) {
      description += `Total Session Time: ${formData.totalSessionTime} seconds\n`;
    }
    
    if (formData.formInteractionTime) {
      description += `Form Interaction Time: ${formData.formInteractionTime} seconds\n`;
    }
    
    if (formData.events) {
      description += `\nAnalytics Events:\n`;
      Object.keys(formData.events).forEach(key => {
        description += `- ${key}: ${formData.events[key]}\n`;
      });
    }
    
    description += `\nSubmitted on: ${new Date().toLocaleString()}`;
    
    return description;
  }
}
