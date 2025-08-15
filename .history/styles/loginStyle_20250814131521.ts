import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
     noOutline: {
          // This is the key for web platforms
          outlineStyle: 'none',
          // For some browsers, using `outline: 'none'` might be more effective
          // You can also use `boxShadow: 'none'` if a shadow is also appearing
          // outline: 'none',
        }
     container: {
          flex: 1,
          backgroundColor: '#F9FAFB',
     },
     content: {
          flex: 1,
          padding: 24,
          justifyContent: 'center',
     },
     header: {
          alignItems: 'center',
          marginBottom: 48,
     },
     logo: {
          width: 80,
          height: 80,
          borderRadius: 40,
          marginBottom: 24,
     },
     title: {
          fontSize: 28,
          fontWeight: '800',
          color: '#1F2937',
          marginBottom: 8,
     }, name: {
          fontSize: 20,
          fontWeight: '800',
          color: '#6B7280',
     },
     subtitle: {
          fontSize: 16,
          color: '#6B7280',
     },
     form: {
          marginBottom: 32,
     },
     inputContainer: {
          marginBottom: 20,
     },
     label: {
          fontSize: 14,
          fontWeight: '600',
          color: '#374151',
          marginBottom: 8,
     },
     input: {
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: '#1F2937',
     },
     passwordContainer: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'white',
          borderWidth: 1,
          borderColor: '#E5E7EB',
          borderRadius: 12,
     },
     passwordInput: {
          flex: 1,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
          color: '#1F2937',
     },
     eyeButton: {
          padding: 14,
     },
     loginButton: {
          backgroundColor: '#3B82F6',
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: 'center',
          marginTop: 8,
     },
     disabledButton: {
          backgroundColor: '#9CA3AF',
     },
     loginButtonText: {
          color: 'white',
          fontSize: 16,
          fontWeight: '700',
     },
     biometricButton: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#EBF4FF',
          borderRadius: 12,
          paddingVertical: 16,
          marginTop: 16,
          gap: 8,
     },
     biometricButtonText: {
          color: '#3B82F6',
          fontSize: 16,
          fontWeight: '600',
     },
     demoSection: {
          alignItems: 'center',
     },
     demoTitle: {
          fontSize: 14,
          fontWeight: '600',
          color: '#6B7280',
          marginBottom: 12,
     },
     demoButtons: {
          flexDirection: 'row',
          gap: 12,
     },
     demoButton: {
          backgroundColor: '#F3F4F6',
          paddingHorizontal: 20,
          paddingVertical: 10,
          borderRadius: 8,
     },
     demoButtonText: {
          color: '#374151',
          fontSize: 14,
          fontWeight: '500',
     },
});