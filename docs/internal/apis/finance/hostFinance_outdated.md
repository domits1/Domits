> # Host Finance
>
> **Code snippets do not match how the code is located in the project itself, but I have the indicated paths where the code can be located.**
> 
> ## Introduction
> Hosts receive payouts via **Stripe Connect** connected to the Domits Business Stripe account.
> 
> - Stripe Connect docs: https://stripe.com/docs/connect
> 
> ---
>
> ## Payment Flow 
> 
> ### Web payments
> ![Web payments flow](https://github.com/user-attachments/assets/88f314cf-76a5-4a2b-9aeb-b046f029cd96)
> 
> ### Sequence: Guest -> Domits -> Host -> Payment Gateway -> Bank
> ![End-to-end payment sequence](https://github.com/user-attachments/assets/e5883665-d67e-4f07-bdfa-8357502de5bc)
> 
> ### API flow (server create flow)
> > How the server handles the create request for payments.
> ![Create request handling sequence](https://github.com/domits1/Domits/assets/108460857/c36e91bb-46d7-4ddf-81a4-215d3c6d3ce7)
> 
> ---
> 
> ## Host Onboarding
> 
> File: `Domits\frontend\web\src\features\hostdashboard\HostFinanceTab.js`
> 
> On load check if the host already has a connected account the **Set up payments** button switches to **Go to Stripe dashboard**.
> 
> ```js HostFinanceTab.js
> useEffect(() => {
>   const setUserEmailAsync = async () => {
>     try {
>       const userInfo = await Auth.currentUserInfo();
>       setUserEmail(userInfo.attributes.email);
>       setCognitoUserId(userInfo.attributes.sub);
> 
>       const response = await fetch('https://2n7strqc40.execute-api.eu-north-1.amazonaws.com/dev/CheckIfStripeExists', {
>         method: 'POST',
>         headers: { 'Content-type': 'application/json; charset=UTF-8' },
>         body: JSON.stringify({ sub: userInfo.attributes.sub }),
>       });
>       const data = await response.json();
>       if (data.hasStripeAccount) setStripeLoginUrl(data.loginLinkUrl);
>     } catch (e) {
>       console.error('Error fetching user data or Stripe status:', e);
>     } finally {
>       setLoading(false);
>     }
>   };
>   setUserEmailAsync();
> }, []);
> ```
> 
> The action handler either opens the Stripe dashboard (login link) or starts onboarding:
> 
> ```js
> async function handleStripeAction() {
>   if (stripeLoginUrl) {
>     window.open(stripeLoginUrl, '_blank');
>   } else if (userEmail && cognitoUserId) {
>     const options = { userEmail, cognitoUserId };
>     const result = await fetch('https://zuak8serw5.execute-api.eu-north-1.amazonaws.com/dev/CreateStripeAccount', {
>       method: 'POST',
>       body: JSON.stringify(options),
>       headers: { 'Content-type': 'application/json; charset=UTF-8' },
>     });
>     const data = await result.json();
>     window.location.replace(data.url); // Stripe Connect onboarding link
>   } else {
>     console.error('User email or cognitoUserId is not defined.');
>   }
> }
> ```