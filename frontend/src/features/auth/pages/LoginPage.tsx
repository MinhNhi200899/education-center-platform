import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, TextInput, PasswordInput, Button, Title, Text, Stack, Alert, Checkbox } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { getHomePath } from '@/lib/roles';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem('auth.rememberMe') === 'true'
  );
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loggedInUser = await login(email, password, rememberMe);
      navigate(getHomePath(loggedInUser));
    } catch (err: any) {
      setError(err.response?.data?.error?.message || t('auth.login.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card shadow="xl" padding="xl" radius="lg" w={400}>
        <Stack gap="lg">
          <div>
            <Title order={2} ta="center" mb={4}>
              {t('auth.login.title')}
            </Title>
            <Text c="dimmed" size="sm" ta="center">
              {t('auth.login.subtitle')}
            </Text>
          </div>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label={t('auth.login.email')}
                placeholder={t('auth.login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <PasswordInput
                label={t('auth.login.password')}
                placeholder={t('auth.login.passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Checkbox
                label={t('auth.login.rememberMe')}
                checked={rememberMe}
                onChange={(e) => {
                  const checked = e.currentTarget.checked;
                  setRememberMe(checked);
                  localStorage.setItem('auth.rememberMe', String(checked));
                }}
              />

              <Button type="submit" fullWidth loading={isLoading} mt="md">
                {t('auth.login.submit')}
              </Button>
            </Stack>
          </form>
        </Stack>
      </Card>
    </Box>
  );
}
