import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScannerDropdownComponent } from './scanner-dropdown/scanner-dropdown.component'; // Import the ScannerDropdownComponent

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ScannerDropdownComponent], // Import the ScannerDropdownComponent
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'my-angular-app';
}
