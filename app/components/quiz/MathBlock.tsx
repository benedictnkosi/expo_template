import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';

interface MathBlockProps {
    expression: string;
}

const MathBlock: React.FC<MathBlockProps> = ({ expression }) => {
    const parts = expression.trim().split(/\s+/); // Split by space

    return (
        <ScrollView horizontal contentContainerStyle={styles.row}>
            {parts.map((part, index) => {
                const html = `
          <html>
            <head>
              <meta charset="utf-8">
              <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css">
              <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.js"></script>
              <style>
                body {
                  margin: 0;
                  padding: 0;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  background: #fff;
                }
                #math {
                  font-size: 2.5rem;
                }
              </style>
            </head>
            <body>
              <div id="math"></div>
              <script>
                document.getElementById("math").innerHTML = katex.renderToString(${JSON.stringify(part)}, {
                  throwOnError: false
                });
              </script>
            </body>
          </html>
        `;

                return (
                    <View key={index} style={styles.block}>
                        <WebView
                            originWhitelist={['*']}
                            source={{ html }}
                            scrollEnabled={false}
                            style={styles.webview}
                        />
                    </View>
                );
            })}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        paddingVertical: 8,
        gap: 8,
    },
    block: {
        width: 240,
        height: 240,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        backgroundColor: '#fff',
        overflow: 'hidden',
    },
    webview: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
});

export default MathBlock;
