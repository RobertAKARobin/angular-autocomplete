import { Component, Input, OnInit, ViewChild } from '@angular/core';
import {
    ControlValueAccessor,
    FormControl,
    NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { MatInput } from '@angular/material/input';
import {
    BehaviorSubject,
    combineLatest,
    merge,
    Observable,
    ReplaySubject,
} from 'rxjs';
import {
    debounceTime,
    distinctUntilChanged,
    filter,
    map,
    shareReplay,
    skipUntil,
    startWith,
    withLatestFrom,
} from 'rxjs/operators';

import { FormOptions, FormOptionValue } from 'src/app/shared/utilities/forms';
import { UtilDirective } from 'src/app/shared/utilities/util.directive';

/**
 * Out of the box, MatAutocomplete's value is whatever's in the text box, even if the user manually typed something into it that isn't a valid menu option.
 * This is a wrapper around MatAutocomplete that forces its value to always be one of the menu options.
 */
@Component({
    selector: 'app-autocomplete',
    templateUrl: './app-autocomplete.component.html',
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            multi: true,
            useExisting: AppAutocompleteComponent,
        },
    ],
})
export class AppAutocompleteComponent
    extends UtilDirective
    implements ControlValueAccessor, OnInit
{
    /**
     * Can't use [formControlName]. This funky component acts as both a ControlValueAccessor and a wrapper around a FormControl.
     */
    @Input() formControl: FormControl;
    /**
     * Time between refreshes of the options menu.
     */
    @Input() debounceTime = 100;
    @Input()
    set options(input: FormOptions) {
        if (input.length > 0) {
            this.options$.next(input);
        }
    }

    @ViewChild(MatAutocomplete, { static: true, read: MatAutocomplete })
    matAutocomplete: MatAutocomplete;
    @ViewChild(MatInput, { static: true, read: MatInput })
    matInput: MatInput;

    /**
     * Passes validators and state to the inner MatInput. Don't want to use the real FormControl because the MatInput gets overwritten all the time -- it's basically just presentational.
     */
    dummyFormControl: FormControl;
    /**
     * Required by ControlValueAccessor. What notifies the FormControl to update.
     */
    onChange: (change: FormOptionValue) => void;
    /**
     * Required by ControlValueAccessor
     */
    onTouch: () => void;

    /**
     * When the FormControl is manipulated outside of this component, e.g. if it has an initial value.
     */
    readonly externalValue$ = new ReplaySubject<FormOptionValue>(1);
    /**
     * When the form starts emitting changes to the FormControl.
     */
    readonly formRegistered$ = new BehaviorSubject(false);
    /**
     * When the autocomplete menu gains/loses focus.
     * Note: MatAuto is dumb and doesn't fire a menu 'close' event if there are no options to show, and therefore no blur. Fortunately doesn't apply here because we always show at least the "No matches" pseudo-option.
     */
    readonly menuFocus$ = new BehaviorSubject(false);
    /**
     * When the text input element gains/loses focus.
     */
    readonly textFocus$ = new ReplaySubject<boolean>(1);
    /**
     * When the input options change.
     */
    readonly options$ = new ReplaySubject<FormOptions>(1);
    readonly optionLabelsByValue$ = this.options$.pipe(
        map(
            (options) =>
                new Map(options.map((option) => [option.value, option.label]))
        ),
        shareReplay(1)
    );
    readonly optionValuesByLabel$ = this.options$.pipe(
        map(
            (options) =>
                new Map(options.map((option) => [option.label, option.value]))
        ),
        shareReplay(1)
    );
    /**
     * When an option is seleccted from the autocomplete menu.
     */
    readonly selectionValue$ = new ReplaySubject<FormOptionValue>(1);
    /**
     * When the text input changes.
     */
    readonly textInput$ = new ReplaySubject<string>(1);
    /**
     * When the text input changes to a valid option label; converts to option
     */
    readonly textInputValue$ = this.textInput$.pipe(
        debounceTime(10),
        distinctUntilChanged(),
        withLatestFrom(this.optionValuesByLabel$),
        map(([value, valuesByLabel]) => valuesByLabel.get(value))
    );
    /**
     * When the FormControl should update with a new value.
     */
    readonly value$ = combineLatest([
        merge(this.externalValue$, this.selectionValue$, this.textInputValue$),
        this.optionLabelsByValue$,
    ]).pipe(
        filter(([value, labelsByValue]) => labelsByValue.has(value)),
        map(([value]) => value),
        shareReplay(1)
    );
    /**
     * When the MatInput should display a new label.
     * MatAutocompleteTrigger#displayWith doesn't play nice with manually updating values.
     */
    readonly label$ = combineLatest([
        this.value$,
        this.optionLabelsByValue$,
    ]).pipe(
        map(([value, labelsByValue]) => labelsByValue.get(value)),
        startWith('')
    );
    /**
     * When the whole field wrapper loses focus.
     */
    readonly blur$ = combineLatest([this.menuFocus$, this.textFocus$]).pipe(
        filter(([menuFocused, textFocused]) => !menuFocused && !textFocused),
        distinctUntilChanged()
    );

    filteredOptions$: Observable<FormOptions>;

    ngOnInit(): void {
        this.dummyFormControl = new FormControl(
            {
                disabled: this.formControl.disabled,
            },
            this.formControl.validator,
            this.formControl.asyncValidator
        );

        this.watch(this.label$).subscribe((label) => {
            this.matInput.value = label;
        });

        this.watch(this.blur$)
            .pipe(withLatestFrom(this.label$))
            .subscribe(([, lastValidLabel]) => {
                if (!this.matInput.value) {
                    this.onChange(null);
                    this.matInput.value = '';
                    return;
                }
                this.matInput.value = lastValidLabel;
            });

        this.filteredOptions$ = combineLatest([
            merge(this.textInput$, this.label$).pipe(
                map((text) => `${text || ''}`.trim().toLowerCase())
            ),
            this.options$,
        ]).pipe(
            map(([text, options]) => {
                if (!text) {
                    return options;
                }
                return options.filter((option) => {
                    return option.label.toString().toLowerCase().includes(text);
                });
            }),
            shareReplay(1)
        );
    }

    /**
     * Required by ControlValueAccessor. Called when the FormControl's value is changed outside of this component.
     */
    writeValue(value: FormOptionValue): void {
        this.externalValue$.next(value);
    }

    /**
     * Required by ControlValueAccessor. Basically the form's version of ngOnInit.
     */
    registerOnChange(onChange: (change: FormOptionValue) => void): void {
        this.onChange = onChange;
        this.watch(this.value$)
            .pipe(skipUntil(this.options$))
            .subscribe((value) => {
                this.onChange(value);
            });
    }

    /**
     * Required by ControlValueAccessor.
     */
    registerOnTouched(onTouched: () => void): void {
        this.onTouch = onTouched;
    }
}
