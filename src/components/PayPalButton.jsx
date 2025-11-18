import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';

/**
 * PayPal支付按钮组件
 * @param {Object} props
 * @param {number} props.amount - 支付金额（美元）
 * @param {string} props.planId - 计划ID（如 'basic', 'professional', 'master'）
 * @param {string} props.billingCycle - 计费周期（'monthly' 或 'yearly'）
 * @param {Function} props.onSuccess - 支付成功回调函数
 * @param {Function} props.onError - 支付错误回调函数
 * @param {Function} props.onCancel - 支付取消回调函数
 */
const PayPalButton = ({ 
  amount, 
  planId, 
  billingCycle, 
  onSuccess, 
  onError, 
  onCancel 
}) => {
  // 从环境变量获取PayPal Client ID
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  if (!clientId) {
    console.error('PayPal Client ID未配置，请在.env文件中设置VITE_PAYPAL_CLIENT_ID');
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        PayPal配置错误：请设置VITE_PAYPAL_CLIENT_ID环境变量
      </div>
    );
  }

  // 创建PayPal订单
  const createOrder = (data, actions) => {
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: amount.toFixed(2), // PayPal要求金额格式为字符串，保留两位小数
            currency_code: 'USD'
          },
          description: `Nano Banana 2 - ${planId} Plan (${billingCycle})`
        }
      ],
      application_context: {
        brand_name: 'Nano Banana 2',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: window.location.origin + '/pricing',
        cancel_url: window.location.origin + '/pricing'
      }
    });
  };

  // 支付批准后的处理
  const onApprove = async (data, actions) => {
    try {
      // 捕获订单详情
      const details = await actions.order.capture();
      console.log('✅ PayPal支付成功:', details);

      // 调用成功回调
      if (onSuccess) {
        onSuccess({
          orderId: details.id,
          payerId: details.payer.payer_id,
          email: details.payer.email_address,
          amount: amount,
          planId: planId,
          billingCycle: billingCycle,
          details: details
        });
      }

      return details;
    } catch (error) {
      console.error('❌ PayPal支付处理失败:', error);
      if (onError) {
        onError(error);
      }
    }
  };

  // 支付错误处理
  const onErrorHandler = (err) => {
    console.error('❌ PayPal支付错误:', err);
    if (onError) {
      onError(err);
    }
  };

  // 支付取消处理
  const onCancelHandler = (data) => {
    console.log('⚠️ PayPal支付取消:', data);
    if (onCancel) {
      onCancel(data);
    }
  };

  return (
    <PayPalScriptProvider
      options={{
        clientId: clientId,
        currency: 'USD',
        intent: 'capture',
        // 使用沙箱环境（开发时）
        // 生产环境时，PayPal会自动检测并使用生产环境
      }}
    >
      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onErrorHandler}
        onCancel={onCancelHandler}
        style={{
          layout: 'vertical', // 或 'horizontal'
          color: 'blue', // 'gold', 'blue', 'silver', 'white', 'black'
          shape: 'rect', // 'pill' 或 'rect'
          label: 'paypal' // 'paypal', 'checkout', 'pay', 'buynow', 'credit'
        }}
      />
    </PayPalScriptProvider>
  );
};

export default PayPalButton;

