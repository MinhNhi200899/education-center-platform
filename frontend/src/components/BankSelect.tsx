import { Group, Image, Loader, Select, Text, type SelectProps } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';

export interface VietQRBank {
  code: string;
  name: string;
  fullName: string;
  logo: string;
  bin: string;
}

interface BankSelectOption {
  value: string;
  label: string;
  logo: string;
}

type Props = Omit<SelectProps, 'data' | 'renderOption'> & {
  value: string;
  onChange: (value: string | null) => void;
};

function BankLogo({ src, size = 22 }: { src: string; size?: number }) {
  return (
    <Image
      src={src}
      alt=""
      w={size}
      h={size}
      radius="sm"
      fit="contain"
      styles={{ root: { flexShrink: 0 } }}
    />
  );
}

export function BankSelect({ value, onChange, label, placeholder, ...rest }: Props) {
  const { t } = useTranslation();

  const { data: banks, isLoading } = useQuery({
    queryKey: ['vietqr-banks'],
    queryFn: async () => {
      const res = await api.get('/payments/vietqr-banks');
      return res.data.data as VietQRBank[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const options: BankSelectOption[] = useMemo(() => {
    const fromApi =
      banks?.map((bank) => ({
        value: bank.code,
        label: `${bank.name} (${bank.code})`,
        logo: bank.logo,
      })) ?? [];

    if (value && !fromApi.some((o) => o.value === value)) {
      fromApi.unshift({
        value,
        label: value,
        logo: `https://cdn.vietqr.io/img/${value}.png`,
      });
    }

    return fromApi;
  }, [banks, value]);

  const selected = options.find((o) => o.value === value);

  return (
    <Select
      label={label ?? t('settings.payments.bank')}
      placeholder={placeholder ?? t('settings.payments.selectBank')}
      data={options}
      value={value || null}
      onChange={onChange}
      searchable
      nothingFoundMessage={t('common.noResults', { defaultValue: 'No results' })}
      disabled={isLoading || rest.disabled}
      leftSection={selected?.logo ? <BankLogo src={selected.logo} size={18} /> : undefined}
      rightSection={isLoading ? <Loader size={16} /> : rest.rightSection}
      renderOption={({ option }) => {
        const bank = option as BankSelectOption;
        return (
          <Group gap="sm" wrap="nowrap">
            {bank.logo ? <BankLogo src={bank.logo} /> : null}
            <Text size="sm" lineClamp={1}>
              {option.label}
            </Text>
          </Group>
        );
      }}
      {...rest}
    />
  );
}
