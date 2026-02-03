/**
 * Paywall Screen
 * Clean, Apple-style upgrade prompt
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useSubscriptionStore, FREE_LOG_LIMIT} from '../stores/useSubscriptionStore';
import {Haptics} from '../utils/haptics';

// Product IDs - must match App Store Connect
const PRODUCT_IDS = {
  monthly: 'com.instalog.pro.monthly',
  yearly: 'com.instalog.pro.yearly',
};

interface PaywallScreenProps {
  onDismiss?: () => void;
  showDismiss?: boolean;
}

const PaywallScreen: React.FC<PaywallScreenProps> = ({
  onDismiss,
  showDismiss = true,
}) => {
  const navigation = useNavigation();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const {
    setPro, 
    markPaywallSeen, 
    logsRemaining, 
    totalLogCount,
    products,
    loadProducts,
    purchase,
    restorePurchases,
    isLoadingProducts,
  } = useSubscriptionStore();
  
  // Load products on mount
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  // Get product prices from loaded products
  const monthlyProduct = products.find(p => p.id === PRODUCT_IDS.monthly);
  const yearlyProduct = products.find(p => p.id === PRODUCT_IDS.yearly);
  
  const handlePurchase = async () => {
    setIsLoading(true);
    Haptics.light();
    
    const productId = selectedPlan === 'monthly' ? PRODUCT_IDS.monthly : PRODUCT_IDS.yearly;
    
    try {
      // DEV: Simulate purchase for testing until StoreKit is configured
      if (__DEV__) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPro(true);
        markPaywallSeen();
        Haptics.success();
        
        Alert.alert(
          'Welcome to Pro',
          'You now have unlimited logs and sync across all your devices.',
          [{text: 'Continue', onPress: () => onDismiss?.() || navigation.goBack()}]
        );
        setIsLoading(false);
        return;
      }
      
      const success = await purchase(productId);
      
      if (success) {
        markPaywallSeen();
        Haptics.success();
        
        Alert.alert(
          'Welcome to Pro',
          'You now have unlimited logs and sync across all your devices.',
          [{text: 'Continue', onPress: () => onDismiss?.() || navigation.goBack()}]
        );
      } else {
        Alert.alert('Purchase Failed', 'Please try again or contact support.');
      }
    } catch (error) {
      Alert.alert('Purchase Failed', 'Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRestore = async () => {
    setIsRestoring(true);
    Haptics.light();
    
    try {
      const restored = await restorePurchases();
      
      if (restored) {
        Haptics.success();
        Alert.alert('Restored', 'Your Pro subscription has been restored.');
        onDismiss?.() || navigation.goBack();
      } else {
        Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for your Apple ID.');
      }
    } catch (error) {
      Alert.alert('Restore Failed', 'Please try again.');
    } finally {
      setIsRestoring(false);
    }
  };
  
  const handleDismiss = () => {
    markPaywallSeen();
    Haptics.light();
    onDismiss?.() || navigation.goBack();
  };
  
  const atLimit = logsRemaining === 0;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}}>
      <View style={{flex: 1, paddingHorizontal: 24}}>
        {/* Dismiss button */}
        {showDismiss && !atLimit && (
          <TouchableOpacity
            onPress={handleDismiss}
            style={{alignSelf: 'flex-end', paddingVertical: 16}}
          >
            <Text style={{color: '#9AA0A6', fontSize: 16}}>Maybe later</Text>
          </TouchableOpacity>
        )}
        
        {/* Spacer */}
        <View style={{flex: atLimit ? 0.3 : 0.15}} />
        
        {/* Icon */}
        <View style={{alignItems: 'center', marginBottom: 24}}>
          <View style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            backgroundColor: '#6E6AF2',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{fontSize: 36}}>✓</Text>
          </View>
        </View>
        
        {/* Headline */}
        <Text style={{
          color: '#EDEEF0',
          fontSize: 32,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 12,
        }}>
          {atLimit ? 'You\'ve reached the limit' : 'Keep the momentum going.'}
        </Text>
        
        {/* Subheadline */}
        <Text style={{
          color: '#9AA0A6',
          fontSize: 17,
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 32,
          paddingHorizontal: 16,
        }}>
          {atLimit 
            ? `You've logged ${totalLogCount} moments. Upgrade to continue capturing.`
            : 'Unlimited everything. All your devices. One calm place for it all.'
          }
        </Text>
        
        {/* Benefits */}
        <View style={{marginBottom: 32}}>
          {[
            'Unlimited logs — never stop capturing what matters',
            'Unlimited buckets — organize however you want',
            'Unlimited widget presets — customize every screen',
            'Seamless sync — pick up where you left off on any device',
            'Your data, your control — export anytime, no lock-in',
          ].map((benefit, index) => (
            <View key={index} style={{flexDirection: 'row', marginBottom: 16, paddingHorizontal: 8}}>
              <Text style={{color: '#6E6AF2', fontSize: 16, marginRight: 12}}>✓</Text>
              <Text style={{color: '#EDEEF0', fontSize: 15, flex: 1, lineHeight: 22}}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Spacer */}
        <View style={{flex: 1}} />
        
        {/* Pricing Options */}
        <View style={{marginBottom: 20}}>
          {isLoadingProducts ? (
            <View style={{alignItems: 'center', paddingVertical: 32}}>
              <ActivityIndicator color="#6E6AF2" />
              <Text style={{color: '#9AA0A6', marginTop: 8}}>Loading prices...</Text>
            </View>
          ) : (
            <>
              {/* Yearly */}
              <TouchableOpacity
                onPress={() => setSelectedPlan('yearly')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: selectedPlan === 'yearly' ? '#1A1D24' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedPlan === 'yearly' ? '#6E6AF2' : '#2A2D34',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View>
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600'}}>
                      Yearly
                    </Text>
                    <View style={{
                      backgroundColor: '#6E6AF2',
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                      marginLeft: 8,
                    }}>
                      <Text style={{color: '#FFFFFF', fontSize: 11, fontWeight: '700'}}>
                        SAVE 44%
                      </Text>
                    </View>
                  </View>
                  <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 2}}>
                    $1.67/month, billed annually
                  </Text>
                </View>
                <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '700'}}>
                  {yearlyProduct?.displayPrice ?? '$19.99'}
                </Text>
              </TouchableOpacity>
              
              {/* Monthly */}
              <TouchableOpacity
                onPress={() => setSelectedPlan('monthly')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: selectedPlan === 'monthly' ? '#1A1D24' : 'transparent',
                  borderWidth: 2,
                  borderColor: selectedPlan === 'monthly' ? '#6E6AF2' : '#2A2D34',
                  borderRadius: 12,
                  padding: 16,
                }}
              >
                <View>
                  <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600'}}>
                    Monthly
                  </Text>
                  <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 2}}>
                    Cancel anytime
                  </Text>
                </View>
                <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '700'}}>
                  {monthlyProduct?.displayPrice ?? '$3.99'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        
        {/* CTA Button */}
        <TouchableOpacity
          onPress={handlePurchase}
          disabled={isLoading}
          style={{
            backgroundColor: '#6E6AF2',
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            marginBottom: 12,
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{color: '#FFFFFF', fontSize: 17, fontWeight: '600'}}>
              Continue with Pro
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Restore */}
        <TouchableOpacity
          onPress={handleRestore}
          disabled={isRestoring}
          style={{alignItems: 'center', paddingVertical: 12}}
        >
          {isRestoring ? (
            <ActivityIndicator color="#9AA0A6" size="small" />
          ) : (
            <Text style={{color: '#9AA0A6', fontSize: 14}}>
              Restore Purchases
            </Text>
          )}
        </TouchableOpacity>
        
        {/* Legal */}
        <Text style={{
          color: '#6B7280',
          fontSize: 11,
          textAlign: 'center',
          lineHeight: 16,
          marginTop: 8,
          marginBottom: 16,
        }}>
          Subscription renews automatically. Cancel anytime in Settings.{'\n'}
          <Text
            onPress={() => Linking.openURL('https://instalog.app/terms')}
            style={{textDecorationLine: 'underline'}}
          >
            Terms
          </Text>
          {' · '}
          <Text
            onPress={() => Linking.openURL('https://instalog.app/privacy')}
            style={{textDecorationLine: 'underline'}}
          >
            Privacy
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

export default PaywallScreen;
