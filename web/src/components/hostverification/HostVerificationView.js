import styles from './hostverification.module.css';
import Option from './components/Option';
import Listing from './components/Listing';

const HostVerificationView = () => {
  return (
    <main className={styles['main-container']}>
        <div className={styles['left-container']}>
          <h1>What is the next step?</h1>
          <Option option="Meet local requirements" />
          <hr></hr>
          <Option option="Verify your identity"/>
          <hr></hr>
          <Option option="Connect with stripe to receive payments"/>
          <hr></hr>
          <Option option="Confirm your phone number"/>
        </div>
        <div className={styles['right-container']}>
          <Listing />
        </div>
      <div className={styles['bottom-container']}>
      <hr></hr>
        <button className={styles['publish-btn']}>Publish Listing</button>
      </div>
    </main>
  );
};

export default HostVerificationView;
