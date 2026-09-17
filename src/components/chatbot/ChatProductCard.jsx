import { Link } from "react-router-dom";
import { onImgError } from "../../lib/imageFallback";

export default function ChatProductCard({ product, onClose }) {
  if (!product) return null;
  return (
    <Link to={product.href} className="chat-product" onClick={onClose}>
      <span className="chat-product-img">
        <img src={product.image} alt="" loading="lazy"  onError={onImgError}/>
        {product.discount > 0 && <span className="chat-product-badge">{product.discount}% OFF</span>}
      </span>
      <span className="chat-product-info">
        <span className="chat-product-name">{product.name}</span>
        <span className="chat-product-price">
          {product.price}
          {product.originalPrice && <span className="chat-product-strike">{product.originalPrice}</span>}
        </span>
      </span>
    </Link>
  );
}
