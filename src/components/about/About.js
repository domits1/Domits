import React from "react";

const styles = {
    layout: {
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'flex',
        width: '607px',
        height: '478px',
        flexDirection: 'column',
        justifyContent: 'center',
        flexShrink: 0,
    },
    typography: {
        color: '#000',
        fontFamily: 'Kanit',
        fontSize: '40px',
        fontStyle: 'normal',
        fontWeight: 500,
        lineHeight: '150%', // 60px
    },
    text: {
        color: '#000',
        fontFamily: 'Kanit',
        fontSize: '20px',
        fontStyle: 'normal',
        fontWeight: 400,
        lineHeight: '150%',
    },
    content: {
        maxWidth: '600px', // Adjust as needed
    },
};

function About() {
    return (
        <div style={styles.layout}>
            <div style={styles.typography}>“Our mission is to simplify travel for 1 million people”</div>
            <div style={styles.text} style={styles.content}>
                <p>
                    Domits is a platform for secure accommodations. On our platform, you'll find a wide range of lodging options.
                </p>
                <p>
                    We strive to support tenants and landlords in every step of the process. Domits acts as the intermediary in this process. You enter into a rental agreement directly with the landlord and/or owner of the accommodation. Through Domits, you have the opportunity to inquire about options without any obligation.
                </p>
                <p>
                    By charging one-time service fees, we can keep our platform running and provide services such as support.
                </p>
            </div>
        </div>
    );
}

export default About;
