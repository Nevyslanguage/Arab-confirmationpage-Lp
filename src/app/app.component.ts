import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmationPageComponent } from './confirmation-page/confirmation-page.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmationPageComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'arabconfirmationpage';
}
