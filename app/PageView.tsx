import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { ThemeContext } from '@/contexts/theme-context';
import { fetchPage } from '@/utils/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { decode } from 'html-entities';
import React, { useContext, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import RenderHtml from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PageView() {
    const { slug } = useLocalSearchParams<{ slug: string }>();
    const router = useRouter();
    const themeContext = useContext(ThemeContext);
    const { width } = useWindowDimensions();

    if (!themeContext) {
        return null;
    }
    const { colorScheme } = themeContext;
    const themeColors = Colors[colorScheme];

    const [loading, setLoading] = useState(true);
    const [pageData, setPageData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadPageData();
    }, [slug]);

    const loadPageData = async () => {
        if (!slug) {
            setError('No page specified');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const response = await fetchPage(slug);
            setPageData(response.data);
        } catch (err: any) {
            console.error('Error loading page:', err);
            setError(err.message || 'Failed to load page content');
        } finally {
            setLoading(false);
        }
    };

    const htmlStyles = {
        body: {
            color: themeColors.text,
        },
        '.title': {
            fontSize: 22,
            fontWeight: 'bold',
            marginBottom: 12,
            color: themeColors.text,
        },
        '.description': {
            fontSize: 16,
            lineHeight: 22,
            marginBottom: 24,
            color: themeColors.text,
            opacity: 0.8,
        },
        '.info-group': {
            marginBottom: 20,
        },
        '.label': {
            fontSize: 14,
            color: '#888',
            marginBottom: 2,
        },
        '.value': {
            fontSize: 17,
            fontWeight: '600',
            color: '#2b5fe2',
            textDecorationLine: 'none',
        },
        '.footer': {
            marginTop: 10,
            paddingTop: 15,
            borderTopWidth: 1,
            borderTopColor: colorScheme === 'dark' ? '#333' : '#eee',
        },
        '.footer-text': {
            fontSize: 14,
            fontStyle: 'italic',
            color: '#999',
        },
        p: {
            marginTop: 0,
            marginBottom: 0,
        }
    } as any;

    const prepareHtml = (str: string) => {
        if (!str) return "";

        var a = decode(str)
            .replace(/\\"/g, '"')
            .replace(/\\\//g, '/')
            .replace(/\\n/g, '');
        console.log(a);
        return a;
    };

    return (
        <SafeAreaView
            style={[styles.safeArea, { backgroundColor: themeColors.background }]}
            edges={['left', 'right', 'top']}
        >
            <StatusBar
                barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
                backgroundColor="transparent"
                translucent={true}
            />

            {/* Header */}
            <ThemedView style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={themeColors.text} />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>
                    {loading ? 'Loading...' : pageData?.title || 'Page'}
                </ThemedText>
                <View style={styles.placeholder} />
            </ThemedView>

            {/* Content */}
            <ThemedView style={styles.container}>
                {loading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#2b5fe2" />
                        <ThemedText style={styles.loadingText}>Loading content...</ThemedText>
                    </View>
                ) : error ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="alert-circle-outline" size={64} color="#E95757" />
                        <ThemedText style={styles.errorText}>{error}</ThemedText>
                        <TouchableOpacity style={styles.retryButton} onPress={loadPageData}>
                            <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {pageData?.image && (
                            <View style={styles.imageContainer}></View>
                        )}

                        {pageData?.description ? (
                            <RenderHtml
                                contentWidth={width - 40}
                                source={{ html: prepareHtml(pageData.description) }}
                                tagsStyles={htmlStyles}
                                ignoredStyles={['width', 'height']}
                                baseStyle={{
                                    color: themeColors.text,
                                }}
                            />
                        ) : (
                            <ThemedText style={styles.noContentText}>
                                No content available
                            </ThemedText>
                        )}
                    </ScrollView>
                )}
            </ThemedView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        flex: 1,
        textAlign: 'center',
    },
    placeholder: {
        width: 40,
    },
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        textAlign: 'center',
        color: '#E95757',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#2b5fe2',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    imageContainer: {
        marginBottom: 20,
    },
    noContentText: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.6,
    },
});
