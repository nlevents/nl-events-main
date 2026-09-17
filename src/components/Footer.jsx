import { Link } from "react-router-dom";
import Icon from "./Icon";
import { waLink } from "../data/images";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Link to="/" className="brand">
              <span className="brand-mark"><img src="/assets/images/brand/logo.png" alt="Next Level Events logo" width="34" height="34" /></span>
              <span>Next Level Events<span>.</span></span>
            </Link>
            <p>Next Level Events Ranchi — Event Planner. Weddings &middot; Anniversaries &middot; Birthdays &middot; Event Management &amp; Premium D&eacute;cor. We create experiences, not just events.</p>
            <p style={{ marginTop: 8 }}>
              Founder — <a href="https://www.instagram.com/sam.verma8" target="_blank" rel="noopener noreferrer">Sam Verma (@sam.verma8)</a> &middot; <a href="https://www.linkedin.com/in/sumit-verma-kumar/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </p>
            <div className="footer-socials">
              <a href="https://www.instagram.com/nextlevelevents.in" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="insta" /></a>
              <a href="https://www.facebook.com/nextlevelevents.in" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" /></a>
              <a href="https://www.youtube.com/@nextlevelevents25" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><Icon name="youtube" /></a>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><Icon name="whatsapp" /></a>
            </div>
          </div>
          <div className="footer-cols">
            <div className="footer-col">
              <h4>Quick Links</h4>
              <Link to="/packages">Packages</Link>
              <Link to="/gallery">Gallery</Link>
              <Link to="/about">About Us</Link>
              <Link to="/book-event">Book Event</Link>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <Link to="/weddings">Weddings</Link>
              <Link to="/birthdays">Birthdays</Link>
              <Link to="/corporate">Corporate</Link>
              <Link to="/concerts">Concerts</Link>
              <Link to="/custom-events">Custom Events</Link>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <li><a href="tel:+917903133317">+91 7903 133 317</a></li>
              <li><a href="mailto:nextlevel.events25@gmail.com">nextlevel.events25@gmail.com</a></li>
              <li>Kanke Road, Beside Chef's Chaupati, Jhigra Toli, Gandhi Nagar, Ranchi, Jharkhand 834002</li>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; {year} Next Level Events Ranchi. All rights reserved.</span>
          <span><Link to="/privacy">Privacy</Link> &middot; <Link to="/terms">Terms</Link></span>
        </div>
        <div className="footer-credit">
          Designed by <a href="https://www.pixelbytes.online" target="_blank" rel="noopener noreferrer">pixelbytes</a>
        </div>
      </div>
    </footer>
  );
}
