const getPricingSavingConfig = async () => {
  try {
    const response = await fetch(
      `https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/pricing/saving-config`
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    return {
      domitsCommissionRate: data?.domitsCommissionRate,
      comparisonCommissionRate: data?.comparisonCommissionRate,
      comparisonPlatformLabel: data?.comparisonPlatformLabel,
    };
  } catch {
    return {};
  }
};

export default getPricingSavingConfig;
