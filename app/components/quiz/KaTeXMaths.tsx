import React, { useState } from 'react';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../../contexts/ThemeContext';

interface KaTeXProps {
    latex: string;
    isOption?: boolean;
    fontSize?: number;
    border?: boolean;
    color?: string;
    width?: string;
    height?: string;
}

export function KaTeX({ latex, isOption, fontSize = 1.5, border = true, color, width = '100%', height = '120px' }: KaTeXProps) {
    const [webViewHeight, setWebViewHeight] = useState(60);
    const { isDark } = useTheme();

    const textColor = color || (isDark ? '#4ADE80' : '#166534');
    const backgroundColor = isDark ? 'transparent' : 'transparent';
    const borderStyle = border ? `1.5px solid ${textColor}` : 'none';

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
                        box-sizing: border-box;
                        overflow-x: hidden;
                        overflow-y: hidden;
                        color: ${textColor};
                        line-height: 3;
                        border: ${borderStyle};
                        border-radius: 16px;
                        padding: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: ${height}px;
                        width: ${width};
                        font-size: ${fontSize}em;
                        letter-spacing: 0.12em;
                    }
                    .katex {
                        font-size: ${fontSize}em !important;
                        color: ${textColor} !important;
                        line-height: 3;
                        width: 100%;
                        box-sizing: border-box;
                        text-align: center !important;
                        letter-spacing: 0.12em;
                    }
                    .katex-display {
                        margin: 0;
                        padding: 5px 0;
                        overflow: visible;
                        text-align: center !important;
                        color: ${textColor} !important;
                        line-height: 3;
                    }
                    .katex-display > .katex {
                        text-align: center !important;
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