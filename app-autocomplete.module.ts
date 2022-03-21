import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AppFieldModule } from 'src/app/shared/modules/app-field';

import { AppAutocompleteComponent } from './app-autocomplete.component';

@NgModule({
    declarations: [AppAutocompleteComponent],
    exports: [AppAutocompleteComponent],
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatAutocompleteModule,
        MatInputModule,
        AppFieldModule,
    ],
})
export class AppAutocompleteModule {}
