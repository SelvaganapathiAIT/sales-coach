import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MessageCircle, Phone, Mail } from "lucide-react";

interface CoachCardProps {
  name: string;
  title: string;
  image: string;
  description: string;
  rating: number;
  reviews: number;
  specialties: string[];
  isLegend?: boolean;
  price: string;
}

const CoachCard = ({ 
  name, 
  title, 
  image, 
  description, 
  rating, 
  reviews, 
  specialties, 
  isLegend = false,
  price 
}: CoachCardProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-card hover:shadow-premium transition-all duration-300 group">
      <div className="flex items-start space-x-4">
        <div className="relative">
          <img 
            src={image} 
            alt={name}
            className="w-20 h-20 rounded-full object-cover border-2 border-border"
          />
          {isLegend && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-accent rounded-full flex items-center justify-center">
              <Star className="w-3 h-3 text-accent-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {name}
            </h3>
            <p className="text-sm text-muted-foreground">{title}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`w-4 h-4 ${
                    i < Math.floor(rating) ? 'text-accent fill-accent' : 'text-muted-foreground'
                  }`} 
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {rating} ({reviews} reviews)
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">{price}</div>
          <div className="text-sm text-muted-foreground">per month</div>
        </div>
      </div>
      
      <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
        {description}
      </p>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {specialties.map((specialty, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {specialty}
          </Badge>
        ))}
      </div>
      
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
        <div className="flex items-center space-x-4 text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          <Phone className="w-4 h-4" />
          <Mail className="w-4 h-4" />
        </div>
        
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">Learn More</Button>
          <Button variant="premium" size="sm">Choose Coach</Button>
        </div>
      </div>
    </div>
  );
};

export default CoachCard;