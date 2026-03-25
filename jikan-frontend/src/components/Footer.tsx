import { motion } from 'framer-motion';
import { Facebook, Twitter, Instagram, Youtube, Mail } from 'lucide-react';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        Browse: ['Home', 'TV Series', 'Movies', 'Latest Episodes', 'Schedule'],
        Categories: ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Romance', 'Sci-Fi'],
        Help: ['FAQ', 'Contact Us', 'Terms of Service', 'Privacy Policy'],
        Social: ['Facebook', 'Twitter', 'Instagram', 'YouTube']
    };

    const socialIcons = {
        Facebook: <Facebook size={20} />,
        Twitter: <Twitter size={20} />,
        Instagram: <Instagram size={20} />,
        YouTube: <Youtube size={20} />
    };

    return (
        <footer style={{
            backgroundColor: '#0a0a0a',
            padding: '4rem 4% 2rem',
            marginTop: '4rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '3rem',
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* Brand Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <h3 style={{
                        color: '#E50914',
                        fontSize: '1.8rem',
                        fontWeight: 800,
                        letterSpacing: '-1px',
                        marginBottom: '1rem'
                    }}>
                        ANIME<span style={{ color: 'white' }}>PRO</span>
                    </h3>
                    <p style={{
                        color: '#a3a3a3',
                        fontSize: '0.9rem',
                        lineHeight: '1.6',
                        marginBottom: '1.5rem'
                    }}>
                        Your ultimate destination for anime streaming. Watch thousands of anime series and movies in HD quality.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        {footerLinks.Social.map((social) => (
                            <motion.a
                                key={social}
                                href="#"
                                whileHover={{ scale: 1.1, color: '#E50914' }}
                                style={{
                                    color: '#a3a3a3',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {socialIcons[social as keyof typeof socialIcons]}
                            </motion.a>
                        ))}
                    </div>
                </motion.div>

                {/* Browse Links */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                >
                    <h4 style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 600,
                        marginBottom: '1.2rem'
                    }}>
                        Browse
                    </h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {footerLinks.Browse.map((link) => (
                            <li key={link}>
                                <a
                                    href={`/${link.toLowerCase().replace(' ', '-')}`}
                                    style={{
                                        color: '#a3a3a3',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#E50914';
                                        e.currentTarget.style.paddingLeft = '5px';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#a3a3a3';
                                        e.currentTarget.style.paddingLeft = '0';
                                    }}
                                >
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* Categories */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <h4 style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 600,
                        marginBottom: '1.2rem'
                    }}>
                        Categories
                    </h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {footerLinks.Categories.map((category) => (
                            <li key={category}>
                                <a
                                    href={`/search?q=${category.toLowerCase()}`}
                                    style={{
                                        color: '#a3a3a3',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#E50914';
                                        e.currentTarget.style.paddingLeft = '5px';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#a3a3a3';
                                        e.currentTarget.style.paddingLeft = '0';
                                    }}
                                >
                                    {category}
                                </a>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* Help & Contact */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <h4 style={{
                        color: 'white',
                        fontSize: '1rem',
                        fontWeight: 600,
                        marginBottom: '1.2rem'
                    }}>
                        Help
                    </h4>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {footerLinks.Help.map((link) => (
                            <li key={link}>
                                <a
                                    href="#"
                                    style={{
                                        color: '#a3a3a3',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#E50914';
                                        e.currentTarget.style.paddingLeft = '5px';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = '#a3a3a3';
                                        e.currentTarget.style.paddingLeft = '0';
                                    }}
                                >
                                    {link}
                                </a>
                            </li>
                        ))}
                    </ul>
                    <div style={{ marginTop: '1.5rem' }}>
                        <p style={{ color: '#a3a3a3', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                            Subscribe to our newsletter
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                style={{
                                    flex: 1,
                                    padding: '0.6rem 1rem',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    color: 'white',
                                    fontSize: '0.9rem',
                                    outline: 'none'
                                }}
                            />
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    padding: '0.6rem 1.2rem',
                                    backgroundColor: '#E50914',
                                    color: 'white',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                <Mail size={16} />
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Bottom Bar */}
            <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                style={{
                    marginTop: '3rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'center',
                    color: '#666',
                    fontSize: '0.85rem'
                }}
            >
                <p>© {currentYear} AnimePro. All rights reserved.</p>
                <p style={{ marginTop: '0.5rem' }}>
                    Made with ❤️ for anime lovers
                </p>
            </motion.div>
        </footer>
    );
};

export default Footer;
