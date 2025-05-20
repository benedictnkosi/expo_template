import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';

const MathBlock = ({ expression }) => {
    const parts = expression.trim().split(/\s+/); // Split by space

    return (
        <ScrollView horizontal contentContainerStyle={styles.container}>
            {parts.map((part, index) => (
                <View key={index} style={styles.block}>
                    <WebView
                        originWhitelist={['*']}
                        source={{
                            html: `
                <html>
                  <head>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.css">
                    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.4/dist/katex.min.js"></script>
                  </head>
                  <body style="margin:0;padding:0;">
                    <div id="math" style="font-size: 18px; padding: 4px;"></div>
                    <script>
                      document.getElementById("math").innerHTML = katex.renderToString("${part}", {
                        throwOnError: false
                      });
                    </script>
                  </body>
                </html>
              `,
                        }}
                        style={styles.webview}
                        scrollEnabled={false}
                    />
                </View>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        padding: 10,
    },
    block: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        marginRight: 8,
        padding: 6,
        backgroundColor: '#fff',
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webview: {
        width: 48,
        height: 48,
        backgroundColor: 'transparent',
    },
});

export default MathBlock;
