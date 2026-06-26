export interface PasswordStrength {
  score: number;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  rules: {
    label: string;
    met: boolean;
  }[];
}

export function getPasswordStrength(password: string): PasswordStrength {
  const rules = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(password) },
    {
      label: 'At least one special character (!@#$...)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const score = rules.filter((rule) => rule.met).length;
  const levels: PasswordStrength['label'][] = [
    'Too short',
    'Weak',
    'Fair',
    'Good',
    'Strong',
  ];
  const colors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'];

  return {
    score,
    label: levels[score],
    color: colors[score],
    rules,
  };
}

export function isStrongPassword(password: string): boolean {
  return getPasswordStrength(password).score === 5;
}
