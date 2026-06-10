/**
 * Mantine 7.17 doesn't expose an `i18n` provider prop on <MantineProvider>.
 * Instead, components that have localizable strings (DateInput, Calendar,
 * DatePicker, FileButton, Pagination, Modal) accept a `locale` prop or have
 * strings overridden via per-component `label`/`placeholder` props.
 *
 * For @mantine/dates, wrap the app in <DatesProvider locale="vi|em|en"> to
 * localize date strings globally. We expose the active locale code here so
 * the consumer can pass it to <DatesProvider>.
 */
export const getDatesLocale = (lng: string): string => {
  if (lng === 'vi' || lng.startsWith('vi')) return 'vi';
  return 'en';
};
