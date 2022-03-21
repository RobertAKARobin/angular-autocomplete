import { Component, Inject, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    FormBuilder,
    FormControl,
    FormsModule,
    ReactiveFormsModule,
} from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AppAutocompleteModule } from './app-autocomplete.module';
import { AppAutocompleteComponent } from './app-autocomplete.component';
import { FormOptions } from 'src/app/shared/utilities/forms';

const INITIAL_VALUE = 'initialValue';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function createComponent(
    initialValue: AppAutocompleteWrapperComponent['initialValue']
): {
    component: AppAutocompleteWrapperComponent;
    el: HTMLElement;
    fixture: ComponentFixture<AppAutocompleteWrapperComponent>;
} {
    TestBed.configureTestingModule({
        declarations: [
            AppAutocompleteComponent,
            AppAutocompleteWrapperComponent,
        ],
        imports: [
            AppAutocompleteModule,
            FormsModule,
            NoopAnimationsModule,
            ReactiveFormsModule,
        ],
        providers: [
            {
                provide: INITIAL_VALUE,
                useValue: initialValue,
            },
        ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppAutocompleteWrapperComponent);
    const el = fixture.nativeElement as HTMLElement;
    return {
        component: fixture.componentInstance,
        el,
        fixture,
    };
}

describe('AppAutocomplete', () => {
    let component: AppAutocompleteWrapperComponent;
    let el: HTMLElement;
    let fixture: ComponentFixture<AppAutocompleteWrapperComponent>;
    let input: HTMLInputElement;
    const initialValue = 'value 2';
    const initialLabel = 'label 2';
    const secondaryValue = 'value 1';
    const secondaryLabel = 'label 1';

    describe('when provided an initial value', () => {
        it('should leave formControl pristine', () => {
            ({ component, el, fixture } = createComponent(initialValue));
            expect(component.field.pristine).toBeTrue();
        });
        it('should have a FormControl with that value', () => {
            ({ component, el, fixture } = createComponent(initialValue));
            expect(component.field.value).toEqual(initialValue);
        });
        describe('if initial value matches an option value', () => {
            beforeEach(() => {
                ({ component, el, fixture } = createComponent(initialValue));
                fixture.detectChanges();
            });
            it('should update the textbox with the option label', () => {
                expect(el.querySelector('input').value).toEqual(initialLabel);
            });
        });
        describe('if initial value does not match an option value', () => {
            beforeEach(() => {
                ({ component, el, fixture } = createComponent('oh no'));
                fixture.detectChanges();
            });
            it('should clear the textbox', () => {
                expect(el.querySelector('input').value).toEqual('');
            });
        });
    });

    xdescribe('when provided options are not provided onInit, e.g. as a result of a subscription', () => {
        xit('waits until options are resolved before emitting a value');
    });

    describe('when text is entered', () => {
        beforeEach(() => {
            ({ component, el, fixture } = createComponent(initialValue));
            input = el.querySelector('input');
            fixture.detectChanges();
        });
        it('should not update formControl.value', () => {
            expect(component.field.value).toEqual(initialValue);
        });
        describe('if any option labels include that text', () => {
            it('should display those options', (done) => {
                input.value = '1';
                input.dispatchEvent(new Event('keyup'));
                fixture.detectChanges();
                component.autocomplete.filteredOptions$.subscribe((options) => {
                    const labels = options.map((o) => o.label);
                    expect(labels.join(',')).toEqual('label 1,label 12');
                    done();
                });
            });
        });
        describe('if no option labels include that text', () => {
            it('should display no options', (done) => {
                input.value = 'oh no';
                input.dispatchEvent(new Event('keyup'));
                fixture.detectChanges();
                component.autocomplete.filteredOptions$.subscribe((options) => {
                    expect(options.length).toEqual(0);
                    done();
                });
            });
        });
        describe('on textbox blur', () => {
            describe('if text matches an option label', () => {
                it('should update formControl.value to the option value', async () => {
                    input.value = secondaryLabel;
                    input.dispatchEvent(new Event('keyup'));
                    input.dispatchEvent(new Event('blur'));
                    fixture.detectChanges();
                    await sleep(20);
                    expect(component.field.value).toEqual(secondaryValue);
                });
            });
            describe('if text does not match an option label', () => {
                beforeEach(() => {
                    input.value = 'oh no';
                    input.dispatchEvent(new Event('keyup'));
                    input.dispatchEvent(new Event('blur'));
                });
                it('should not update formControl.value', () => {
                    expect(component.field.value).toEqual(initialValue);
                });
                it('should revert the textbox to the last label', () => {
                    expect(input.value).toEqual(initialLabel);
                });
            });
            describe('if text is empty', () => {
                beforeEach(() => {
                    input.value = '';
                    input.dispatchEvent(new Event('keyup'));
                    input.dispatchEvent(new Event('blur'));
                    fixture.detectChanges();
                });
                it('should update formControl.value', () => {
                    expect(component.field.value).toBeFalsy();
                });
                it('should set an empty label', () => {
                    expect(input.value).toBeFalsy();
                });
            });
        });
    });

    describe('on select', () => {
        beforeEach(() => {
            ({ component, el, fixture } = createComponent(initialValue));
            input = el.querySelector('input');
            fixture.detectChanges();
            component.autocomplete.selectionValue$.next(secondaryValue);
            fixture.detectChanges();
        });
        it('should update the formControl.value to the option value', () => {
            expect(component.field.value).toEqual(secondaryValue);
        });
        it('should update the textbox to the option label', () => {
            expect(input.value).toEqual(secondaryLabel);
        });
    });

    describe('on FormControl value manual change', () => {
        beforeEach(() => {
            ({ component, el, fixture } = createComponent(initialValue));
            input = el.querySelector('input');
            component.field.setValue(secondaryValue);
            fixture.detectChanges();
        });
        it('should update the formControl.value to the option value', () => {
            expect(component.field.value).toEqual(secondaryValue);
        });
        it('should update the textbox to the option label', () => {
            expect(input.value).toEqual(secondaryLabel);
        });
    });
});

@Component({
    template: `
        <ng-container [formGroup]="form">
            <app-autocomplete
                [formControl]="field"
                [debounceTime]="0"
                [options]="options"
            >
            </app-autocomplete>
        </ng-container>
    `,
})
class AppAutocompleteWrapperComponent {
    @ViewChild(AppAutocompleteComponent, {
        read: AppAutocompleteComponent,
        static: true,
    })
    autocomplete: AppAutocompleteComponent;

    constructor(
        public formBuilder: FormBuilder,
        @Inject(INITIAL_VALUE) public initialValue: string
    ) {}

    form = this.formBuilder.group({
        autocomplete: [this.initialValue],
    });

    options: FormOptions = [
        {
            label: 'label 1',
            value: 'value 1',
        },
        {
            label: 'label 2',
            value: 'value 2',
        },
        {
            label: 'label 12',
            value: 'value 12',
        },
    ];

    get field(): FormControl {
        return this.form.get('autocomplete') as FormControl;
    }
}
