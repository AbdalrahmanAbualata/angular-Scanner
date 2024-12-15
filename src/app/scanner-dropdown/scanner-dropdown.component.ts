

import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';
import * as jsPDF from 'jspdf';  
import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css'
import { FormsModule } from '@angular/forms';




interface Scanner {
  Name: string;
  ID: string;
  HasFeeder: boolean;
}

interface ApiResponse {
  Data: Scanner[];
  ErrorMessage: string;
  ErrorCode: string;
  IsError: boolean;
}

@Component({                  
  selector: 'app-scanner-dropdown',
  standalone: true,
  imports: [HttpClientModule, CommonModule,FormsModule], // Import HttpClientModule in the component
  templateUrl: './scanner-dropdown.component.html',
  styleUrls: ['./scanner-dropdown.component.css']
})

export class ScannerDropdownComponent implements OnInit {
  scanners: Scanner[] = [];  // Store the full scanner details (Name, ID, HasFeeder)
  selectedScanner: Scanner | null = null; // Now store the selected scanner object
  feedingType: number = 2; // Default feeding type (flatbed)
  isLoading: boolean = false;
  error: string | null = null;

  images: string[] = [];  // List of uploaded images (URLs or base64 data)
  previewImageSrc: string | null = null;  // Source of the image to preview
  previewImageIndex: number = -1;  // Index of the image currently being previewed
  isModalOpen: boolean = false;


  showDelete: boolean[] = [];

  // For editing image
  isEditing: boolean = false;
  editingImageIndex: number = -1;
  editedImage: any = null;

  rotationAngle: number = 0; // Track the rotation angle
  cropStartX: number = 0;    // Start X for cropping rectangle
  cropStartY: number = 0;    // Start Y for cropping rectangle
  cropWidth: number = 0;     // Width of the cropping rectangle
  cropHeight: number = 0;    // Height of the cropping rectangle
  isCropping: boolean = false; // Flag to track if the user is cropping
  canCrop: boolean = false;   // Flag to track if cropping is enabled

  private cropper: Cropper | null = null;


  @ViewChild('canvas', { static: false }) canvasRef: ElementRef<HTMLImageElement> | undefined;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.fetchScanners();
  }


  
  fetchScanners(): void {
    this.isLoading = true;
    this.error = null;
  
    this.http.get<ApiResponse>('http://localhost:11234/api/ScanApi/GetScannerList')
      .pipe(
        catchError(err => {
          this.error = `Error: ${err.message || 'Unable to fetch scanners.'}`;
          console.error('API Error:', err);
          this.isLoading = false;
          return of({ Data: [], ErrorMessage: 'Unable to fetch data', ErrorCode: 'ERROR', IsError: true });
        })
      )
      .subscribe(response => {
        this.isLoading = false;
        
        if (response.IsError) {
         
          this.error = `Error: ${response.ErrorMessage}`;
        } else {
         
          this.scanners = response.Data;
        }
      });
  }



  handleScannerChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedScannerName = selectElement.value;

    this.selectedScanner = this.scanners.find(scanner => scanner.Name === selectedScannerName) || null;

    // Set default feeding type based on HasFeeder
    if (this.selectedScanner) {
      this.feedingType = this.selectedScanner.HasFeeder ? 2 : 1;  
    }
  }
  


  scanImage(): void {
    if (!this.selectedScanner) {
      alert('Please select a scanner first.');
      return;
    }

    this.isLoading = true;
    this.error="";

    const apiUrl = `http://localhost:11234/api/ScanApi/ScannerPrint?scannerName=${encodeURIComponent(this.selectedScanner.Name)}&feedingType=${this.feedingType}`;

    this.http.get<{ Data: string, ErrorMessage: string, IsError: boolean }>(apiUrl).pipe(
      catchError(err => {
        this.error = `Error: ${err.message || 'Unable to scan image.'}`;
        this.isLoading = false;
        return of({ Data: '', ErrorMessage: '', IsError: false });
      })
    ).subscribe(response => {
      console.log('API Response:', response);

      if (response.IsError) {
        this.error = response.ErrorMessage || 'An error occurred during scanning';
        this.isLoading = false;
        return;
      }

      if (response.Data) {
        // if (this.isValidBase64(response.Data)) {
        if (response.Data.length==0) {
          this.error="No paper in the scanner or issue in feeding the paper";
        }

        for (let num = 0; num < response.Data.length; num++) {
          this.images.push("data:image/bmp;base64," + response.Data[num]);

        }
        // } else {
        //   this.error = 'Invalid base64 image data.';
        // }
      } else {
        this.error = 'Scanning failed or no image returned.';
      }

      this.isLoading = false;
    });
  }
  
  
  // Helper function to validate if the string is a valid base64
  isValidBase64(data: string): boolean {
    const base64Pattern = /^([A-Za-z0-9+\/=]|\r|\n)+$/;
    return base64Pattern.test(data);
  }
  

  // Show the delete button when hovering over the thumbnail
  showDeleteButton(index: number): void {
    this.showDelete[index] = true;
  }

  // Hide the delete button when mouse leaves the thumbnail
  hideDeleteButton(index: number): void {
    this.showDelete[index] = false;
  }

  // Method to delete an image
  deleteImage(event: MouseEvent, index: number): void {
    
    event.stopPropagation();

    if (index > -1 && index < this.images.length) {
      this.images.splice(index, 1);  
      this.showDelete.splice(index, 1);  
    }
  }


  editImage(event: MouseEvent, index: number): void {
    event.stopPropagation();
  

     // Destroy the existing cropper if it's initialized
  if (this.cropper) {
    this.cropper.destroy();
    this.cropper = null;
  }


    this.isEditing = true;
    setTimeout(() => {
    this.editingImageIndex = index;
    const canvas = this.canvasRef?.nativeElement;

    if (canvas) {
      this.editedImage = new Image();
      this.editedImage.onload = () => {
        // Set the canvas size to match the image dimensions
        canvas.width = 500;
        canvas.height = 500;
  
          const aspectRatio = this.editedImage.width / this.editedImage.height;
          this.cropper = new Cropper(canvas, {
            aspectRatio: aspectRatio,
            viewMode: 1,
            autoCropArea: 1,  
            initialAspectRatio: aspectRatio,
            cropBoxResizable: true,
          });

      };
      this.editedImage.src = this.images[index];
    } else {
      console.error('Canvas element not found.');
    }
  }, 1);
  }
  
  
  adjustRotation(degree: number): void {
    if (this.cropper) {
      this.cropper.rotate(degree);
    } else {
      console.error('Cropper is not initialized.');
    }
  }
  

  applyCrop(): void {
    if (this.cropper) {
      const croppedCanvas = this.cropper.getCroppedCanvas();
      if (croppedCanvas) {
        const croppedImage = new Image();
        croppedImage.src = croppedCanvas.toDataURL('image/png');
  
        croppedImage.onload = () => {
          this.editedImage = croppedImage;
          this.images[this.editingImageIndex] = croppedImage.src;
          this.isEditing = false;
          this.cropper?.destroy();
        };
      }
    } else {
      console.error('Cropper not initialized.');
      alert('Error applying crop: Cropper not initialized.');
    }
  }
  
  
  saveChanges(): void { this.applyCrop(); 
    }

  // Cancel editing mode
  cancelEditing(): void {
    if (this.cropper) {
      this.cropper.destroy();
    } else {
      console.error('Cropper is not initialized.');
    }
    this.isEditing = false; // Exit editing mode without saving
  }


  // Open the modal and set the preview image
  openModal(imageSrc: string, index: number): void {
    this.previewImageSrc = imageSrc;
    this.previewImageIndex = index;
    this.isModalOpen = true;
  }

  // Close the modal
  closeModal(): void {
    this.isModalOpen = false;
  }


  navigateImage(direction: 'next' | 'previous'): void {
    if (direction === 'next' && this.previewImageIndex < this.images.length - 1) {
      this.previewImageIndex++;
    } else if (direction === 'previous' && this.previewImageIndex > 0) {
      this.previewImageIndex--;
    }
    this.previewImageSrc = this.images[this.previewImageIndex];
  }

  
  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files) {
      const files = Array.from(input.files);
      files.forEach(file => {
        if (this.isValidImage(file)) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.images.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  isValidImage(file: File): boolean {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/bmp'];
    return validImageTypes.includes(file.type);
  }

  // Method to generate a PDF from uploaded images
  async generatePDF(): Promise<void> {
    if (this.images.length === 0) {
      alert('No images to generate a PDF.');
      return;
    }
  
    const pdf = new jsPDF.jsPDF();
    
    // Page dimensions (A4 by default)
    const pageWidth = pdf.internal.pageSize.width;
    const pageHeight = pdf.internal.pageSize.height;
  
    const loadImagePromises = this.images.map((image, index) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
  
        img.onload = () => {
          const imgWidth = 180; 
          const aspectRatio = img.width / img.height;
          const imgHeight = imgWidth / aspectRatio;
  
        
          const xPos = (pageWidth - imgWidth) / 2;
          const yPos = (pageHeight - imgHeight) / 2;
  
          pdf.addImage(img, 'JPEG', xPos, yPos, imgWidth, imgHeight);
  

          if (index < this.images.length - 1) {
            pdf.addPage();
          }
  
          resolve(); 
        };
  
        img.onerror = () => {
          reject(`Error loading image at index ${index}`); 
        };
  
        img.src = image;
      });
    });
  
    try {
      await Promise.all(loadImagePromises);
      pdf.save('images.pdf');
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Error loading images for PDF generation.');
    }
  }
  

}
