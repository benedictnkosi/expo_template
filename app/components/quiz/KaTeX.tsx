import React, { useState } from 'react';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../contexts/ThemeContext';

interface KaTeXProps {
    latex: string;
    isOption?: boolean;
}

export function KaTeX({ latex, isOption }: KaTeXProps) {
    const [webViewHeight, setWebViewHeight] = useState(60);
    const { isDark } = useTheme();

    const textColor = isDark ? '#4ADE80' : '#166534';
    const backgroundColor = isDark ? 'transparent' : 'transparent';

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
                <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                <style>
                    :root {
                        color-scheme: ${isDark ? 'dark' : 'light'};
                    }
                    body {
                        margin: 0;
                        padding: 8px;
                        background-color: ${backgroundColor};
                        color: ${textColor};
                    }
                    #formula {
                        width: 100%;
                        overflow-x: auto;
                        overflow-y: visible;
                        padding: 5px 0;
                        color: ${textColor};
                        line-height: 3;
                    }
                    .katex {
                        font-size: ${isOption && latex.length > 70 ? '0.8em' : '1em'};
                        color: ${textColor} !important;
                        text-align: left;
                        line-height: 3;
                    }
                    .katex-display {
                        margin: 0;
                        padding: 5px 0;
                        overflow: visible;
                        text-align: left !important;
                        color: ${textColor} !important;
                        line-height: 3;
                    }
                    .katex-display > .katex {
                        text-align: left !important;
                        color: ${textColor} !important;
                        line-height: 3;
                    }
                    .katex .base { color: ${textColor} !important; }
                    .katex .mord { color: ${textColor} !important; }
                    .katex .mbin { color: ${textColor} !important; }
                    .katex .mrel { color: ${textColor} !important; }
                    .katex .mopen { color: ${textColor} !important; }
                    .katex .mclose { color: ${textColor} !important; }
                    .katex .mpunct { color: ${textColor} !important; }
                    .katex .minner { color: ${textColor} !important; }
                    .katex .mord.text { color: ${textColor} !important; }
                    .katex .mspace { background-color: transparent; }
                    .katex .strut { color: ${textColor} !important; }
                    .katex .vlist { color: ${textColor} !important; }
                </style>
            </head>
            <body>
                <div id="formula"></div>
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        katex.render(String.raw\`${latex}\`, document.getElementById("formula"), {
                            throwOnError: false,
                            displayMode: true,
                            trust: true,
                            strict: false,
                            output: 'html'
                        });
                        window.ReactNativeWebView.postMessage(document.documentElement.scrollHeight);
                    });
                </script>
            </body>
        </html>
    `;

    return (
        <WebView
            source={{ html }}
            style={{ height: webViewHeight, backgroundColor }}
            scrollEnabled={false}
            onMessage={(event) => {
                const height = parseInt(event.nativeEvent.data);
                setWebViewHeight(height);
            }}
        />
    );
} 