import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { settingsApi } from '../services/api';

interface Settings {
  dorm_name: string;
  address: string;
  phone: string;
  tax_id: string;
  email: string;
  currency_symbol: string;
  default_electric_rate: string;
  default_water_rate: string;
  default_service_charge: string;
  default_security_deposit: string;
  payment_due_day: string;
}

interface SettingsContextType {
  settings: Settings;
  loading: boolean;
}

const defaultSettings: Settings = {
  dorm_name: 'หอพักของฉัน',
  address: '',
  phone: '',
  tax_id: '',
  email: '',
  currency_symbol: '฿',
  default_electric_rate: '8.0',
  default_water_rate: '18.0',
  default_service_charge: '100.0',
  default_security_deposit: '2000',
  payment_due_day: '7',
};

export const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  loading: true,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const r = await settingsApi.get();
      if (r.data) {
        setSettings({
          dorm_name: r.data.dorm_name || defaultSettings.dorm_name,
          address: r.data.address || defaultSettings.address,
          phone: r.data.phone || defaultSettings.phone,
          tax_id: r.data.tax_id || defaultSettings.tax_id,
          email: r.data.email || defaultSettings.email,
          currency_symbol: r.data.currency_symbol || defaultSettings.currency_symbol,
          default_electric_rate: String(r.data.default_electric_rate ?? defaultSettings.default_electric_rate),
          default_water_rate: String(r.data.default_water_rate ?? defaultSettings.default_water_rate),
          default_service_charge: String(r.data.default_service_charge ?? defaultSettings.default_service_charge),
          default_security_deposit: String(r.data.default_security_deposit ?? defaultSettings.default_security_deposit),
          payment_due_day: String(r.data.payment_due_day ?? defaultSettings.payment_due_day),
        });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    setLoading(false);
  };

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
