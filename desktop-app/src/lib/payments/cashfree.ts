import type { PaymentGatewayMode } from '@/types';

declare global {
  interface Window {
    Cashfree?: (options: { mode: 'sandbox' | 'production' }) => {
      checkout: (options: {
        paymentSessionId: string;
        redirectTarget?: '_self' | '_blank' | '_top' | '_modal';
      }) => Promise<{ error?: { message?: string } } | void>;
    };
  }
}

let cashfreeScriptPromise: Promise<void> | null = null;

function resolveCheckoutMode(mode: PaymentGatewayMode | null | undefined): 'sandbox' | 'production' {
  if (mode === 'mock') {
    throw new Error('Cashfree hosted checkout is unavailable in mock mode');
  }

  return mode === 'production' ? 'production' : 'sandbox';
}

async function ensureCashfreeSdkLoaded(): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Cashfree checkout is only available in the browser');
  }

  if (typeof window.Cashfree === 'function') {
    return;
  }

  if (!cashfreeScriptPromise) {
    cashfreeScriptPromise = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>(
        'script[data-cashfree-sdk="true"]',
      );

      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(), { once: true });
        existingScript.addEventListener(
          'error',
          () => reject(new Error('Failed to load the Cashfree checkout SDK')),
          { once: true },
        );
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.dataset.cashfreeSdk = 'true';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load the Cashfree checkout SDK'));
      document.body.appendChild(script);
    });
  }

  await cashfreeScriptPromise;

  if (typeof window.Cashfree !== 'function') {
    throw new Error('Cashfree checkout SDK loaded, but the checkout function is unavailable');
  }
}

export async function openCashfreeCheckout(input: {
  mode: PaymentGatewayMode | null | undefined;
  paymentSessionId: string | null | undefined;
  redirectTarget?: '_self' | '_blank' | '_top' | '_modal';
}): Promise<void> {
  if (!input.paymentSessionId?.trim()) {
    throw new Error('Cashfree payment session ID is missing');
  }

  await ensureCashfreeSdkLoaded();

  const cashfreeFactory = window.Cashfree;

  if (typeof cashfreeFactory !== 'function') {
    throw new Error('Cashfree checkout is unavailable on this page');
  }

  const cashfree = cashfreeFactory({
    mode: resolveCheckoutMode(input.mode),
  });
  const result = await cashfree.checkout({
    paymentSessionId: input.paymentSessionId.trim(),
    redirectTarget: input.redirectTarget ?? '_blank',
  });

  if (result && typeof result === 'object' && result.error?.message) {
    throw new Error(result.error.message);
  }
}
