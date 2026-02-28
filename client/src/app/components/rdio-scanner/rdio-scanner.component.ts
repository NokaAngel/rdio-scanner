/*
 * *****************************************************************************
 * Copyright (C) 2019-2026 Chrystian Huot <chrystian.huot@saubeo.solutions>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>
 * ****************************************************************************
 */

import { Component, ElementRef, HostBinding, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { MatSnackBar } from '@angular/material/snack-bar';
import { timer } from 'rxjs';
import { RdioScannerEvent, RdioScannerLivefeedMode, RdioScannerTheme, RdioScannerThemePreset } from './rdio-scanner';
import { RdioScannerService } from './rdio-scanner.service';
import { RdioScannerNativeComponent } from './native/native.component';

@Component({
    selector: 'rdio-scanner',
    styleUrls: ['./rdio-scanner.component.scss'],
    templateUrl: './rdio-scanner.component.html',
})
export class RdioScannerComponent implements OnDestroy, OnInit {
    readonly themePresets: { label: string; value: RdioScannerThemePreset }[] = [
        { label: 'Classic Scanner', value: RdioScannerThemePreset.ClassicScanner },
        { label: 'Modern Dark', value: RdioScannerThemePreset.ModernDark },
        { label: 'Custom', value: RdioScannerThemePreset.Custom },
    ];

    readonly themes: Record<RdioScannerThemePreset.ClassicScanner | RdioScannerThemePreset.ModernDark, RdioScannerTheme> = {
        [RdioScannerThemePreset.ClassicScanner]: {
            accent: 'rgb(0, 230, 118)',
            background: 'rgb(30, 30, 30)',
            button: 'rgb(45, 45, 45)',
            display: 'rgb(209, 238, 238)',
            ledGlowStrength: 1,
            panel: 'rgb(30, 30, 30)',
            text: 'rgb(255, 255, 255)',
        },
        [RdioScannerThemePreset.ModernDark]: {
            accent: 'rgb(128, 222, 234)',
            background: 'rgb(10, 12, 18)',
            button: 'rgb(38, 44, 58)',
            display: 'rgb(35, 47, 64)',
            ledGlowStrength: 1.4,
            panel: 'rgb(18, 22, 31)',
            text: 'rgb(224, 230, 237)',
        },
    };

    theme: RdioScannerTheme = { ...this.themes[RdioScannerThemePreset.ClassicScanner] };
    themePreset: RdioScannerThemePreset = RdioScannerThemePreset.ClassicScanner;

    private eventSubscription = this.rdioScannerService.event.subscribe((event: RdioScannerEvent) => this.eventHandler(event));

    private livefeedMode: RdioScannerLivefeedMode = RdioScannerLivefeedMode.Offline;

    @ViewChild('searchPanel') private searchPanel: MatSidenav | undefined;

    @ViewChild('selectPanel') private selectPanel: MatSidenav | undefined;

    @HostBinding('style') hostStyle: { [key: string]: string } = {};

    private readonly localStorageCustomThemeKey = 'rdio-scanner-theme-custom';
    private readonly localStorageThemePresetKey = 'rdio-scanner-theme-preset';

    constructor(
        private matSnackBar: MatSnackBar,
        private ngElementRef: ElementRef,
        private rdioScannerService: RdioScannerService,
    ) { }

    @HostListener('window:beforeunload', ['$event'])
    exitNotification(event: BeforeUnloadEvent): void {
        if (this.livefeedMode !== RdioScannerLivefeedMode.Offline) {
            event.preventDefault();

            event.returnValue = 'Live Feed is ON, do you really want to leave?';
        }
    }

    ngOnDestroy(): void {
        this.eventSubscription.unsubscribe();
    }

    ngOnInit(): void {
        this.loadLocalTheme();

        /*
         * BEGIN OF RED TAPE:
         * 
         * By modifying, deleting or disabling the following lines, you harm
         * the open source project and its author.  Rdio Scanner represents a lot of
         * investment in time, support, testing and hardware.
         * 
         * Be respectful, sponsor the project if you can, use native apps when possible.
         * 
         */
        timer(10000).subscribe(() => {
            const ua: string = navigator.userAgent;

            if (ua.includes('Android') || ua.includes('iPad') || ua.includes('iPhone')) {
                this.matSnackBar.openFromComponent(RdioScannerNativeComponent, { panelClass: 'snackbar-white' });
            }
        });
        /**
         * END OF RED TAPE.
         */
    }

    scrollTop(e: HTMLElement): void {
        setTimeout(() => e.scrollTo(0, 0));
    }

    start(): void {
        this.rdioScannerService.startLivefeed();
    }

    stop(): void {
        this.rdioScannerService.stopLivefeed();

        this.searchPanel?.close();
        this.selectPanel?.close();
    }

    toggleFullscreen(): void {
        if (document.fullscreenElement) {
            const el: {
                exitFullscreen?: () => void;
                mozCancelFullScreen?: () => void;
                msExitFullscreen?: () => void;
                webkitExitFullscreen?: () => void;
            } = document;

            if (el.exitFullscreen) {
                el.exitFullscreen();

            } else if (el.mozCancelFullScreen) {
                el.mozCancelFullScreen();

            } else if (el.msExitFullscreen) {
                el.msExitFullscreen();

            } else if (el.webkitExitFullscreen) {
                el.webkitExitFullscreen();
            }

        } else {
            const el = this.ngElementRef.nativeElement;

            if (el.requestFullscreen) {
                el.requestFullscreen();

            } else if (el.mozRequestFullScreen) {
                el.mozRequestFullScreen();

            } else if (el.msRequestFullscreen) {
                el.msRequestFullscreen();

            } else if (el.webkitRequestFullscreen) {
                el.webkitRequestFullscreen();
            }
        }
    }

    updateCustomTheme(theme: RdioScannerTheme): void {
        this.themePreset = RdioScannerThemePreset.Custom;
        this.theme = { ...theme };
        this.persistTheme();
        this.applyTheme();
    }

    updateThemePreset(themePreset: RdioScannerThemePreset): void {
        this.themePreset = themePreset;

        if (themePreset !== RdioScannerThemePreset.Custom) {
            this.theme = { ...this.themes[themePreset] };
        }

        this.persistTheme();
        this.applyTheme();
    }

    private eventHandler(event: RdioScannerEvent): void {
        if (event.livefeedMode) {
            this.livefeedMode = event.livefeedMode;
        }

        if (event.config && event.config.themePreset && !this.readStoredThemePreset()) {
            this.updateThemePreset(event.config.themePreset);
        }
    }

    private applyTheme(): void {
        this.hostStyle = {
            '--scanner-background': this.theme.background,
            '--scanner-panel': this.theme.panel,
            '--scanner-text': this.theme.text,
        };
    }

    private loadLocalTheme(): void {
        const themePreset = this.readStoredThemePreset();

        if (themePreset) {
            this.themePreset = themePreset;
        }

        if (this.themePreset === RdioScannerThemePreset.Custom) {
            const storedTheme = this.readStoredCustomTheme();

            if (storedTheme) {
                this.theme = storedTheme;
            }
        } else {
            this.theme = { ...this.themes[this.themePreset] };
        }

        this.applyTheme();
    }

    private persistTheme(): void {
        localStorage.setItem(this.localStorageThemePresetKey, this.themePreset);

        if (this.themePreset === RdioScannerThemePreset.Custom) {
            localStorage.setItem(this.localStorageCustomThemeKey, JSON.stringify(this.theme));
        }
    }

    private readStoredCustomTheme(): RdioScannerTheme | undefined {
        try {
            const value = localStorage.getItem(this.localStorageCustomThemeKey);

            if (!value) {
                return undefined;
            }

            const parsed = JSON.parse(value);

            if (typeof parsed !== 'object') {
                return undefined;
            }

            return {
                accent: typeof parsed.accent === 'string' ? parsed.accent : this.themes[RdioScannerThemePreset.ClassicScanner].accent,
                background: typeof parsed.background === 'string' ? parsed.background : this.themes[RdioScannerThemePreset.ClassicScanner].background,
                button: typeof parsed.button === 'string' ? parsed.button : this.themes[RdioScannerThemePreset.ClassicScanner].button,
                display: typeof parsed.display === 'string' ? parsed.display : this.themes[RdioScannerThemePreset.ClassicScanner].display,
                ledGlowStrength: typeof parsed.ledGlowStrength === 'number' ? parsed.ledGlowStrength : this.themes[RdioScannerThemePreset.ClassicScanner].ledGlowStrength,
                panel: typeof parsed.panel === 'string' ? parsed.panel : this.themes[RdioScannerThemePreset.ClassicScanner].panel,
                text: typeof parsed.text === 'string' ? parsed.text : this.themes[RdioScannerThemePreset.ClassicScanner].text,
            };

        } catch {
            return undefined;
        }
    }

    private readStoredThemePreset(): RdioScannerThemePreset | undefined {
        const value = localStorage.getItem(this.localStorageThemePresetKey);

        if (value && Object.values(RdioScannerThemePreset).includes(value as RdioScannerThemePreset)) {
            return value as RdioScannerThemePreset;
        }

        return undefined;
    }
}
