import { Star, Briefcase, Code, Palette, TrendingUp, Users } from 'lucide-react';

interface Testimonial {
  name: string;
  title: string;
  review: string;
  avatar: React.ReactNode;
  rating: number;
}

const testimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    title: "Product Manager",
    review: "Inbox Advisor has transformed how I handle my emails. I used to spend hours sorting through messages, now I know exactly what needs my attention first. It's like having a personal assistant for my inbox.",
    avatar: <Briefcase className="w-6 h-6 text-white" />,
    rating: 5
  },
  {
    name: "David K.",
    title: "Software Engineer", 
    review: "As a developer, I get tons of technical emails mixed with urgent client requests. This tool perfectly separates what needs immediate action vs what can wait. My response time has improved dramatically.",
    avatar: <Code className="w-6 h-6 text-white" />,
    rating: 5
  },
  {
    name: "Emma T.",
    title: "Marketing Director",
    review: "I was drowning in emails from campaigns, vendors, and internal teams. Inbox Advisor's smart categorization helps me prioritize client communications and never miss important opportunities again.",
    avatar: <TrendingUp className="w-6 h-6 text-white" />,
    rating: 5
  },
  {
    name: "Michael R.",
    title: "Creative Director",
    review: "The visual organization is fantastic. I love how it clearly shows which projects need follow-up and which clients are waiting for responses. It's made my creative workflow so much smoother.",
    avatar: <Palette className="w-6 h-6 text-white" />,
    rating: 5
  },
  {
    name: "Lisa C.",
    title: "Sales Manager",
    review: "This has been a game-changer for managing prospect communications. I never miss a hot lead anymore, and the follow-up tracking ensures I stay on top of every opportunity in my pipeline.",
    avatar: <Users className="w-6 h-6 text-white" />,
    rating: 5
  }
];

const getAvatarColor = (index: number) => {
  const colors = [
    'bg-gradient-to-r from-blue-600 to-indigo-600',
    'bg-gradient-to-r from-purple-600 to-pink-600', 
    'bg-gradient-to-r from-green-600 to-emerald-600',
    'bg-gradient-to-r from-orange-600 to-red-600',
    'bg-gradient-to-r from-teal-600 to-cyan-600'
  ];
  return colors[index % colors.length];
};

export function Testimonials() {
  return (
    <div className="py-24 px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl mb-6 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent tracking-tight leading-tight drop-shadow-sm">
            Loved by everyone who uses emails to communicate
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Join thousands of users who have transformed their email productivity with Inbox Advisor
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-sm hover:shadow-md transition-shadow duration-200">
              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              
              {/* Review */}
              <p className="text-slate-700 leading-snug mb-3 text-xs">
                "{testimonial.review}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getAvatarColor(index)}`}>
                  {testimonial.avatar}
                </div>
                <div>
                  <p className="text-slate-900 font-medium text-xs">{testimonial.name}</p>
                  <p className="text-slate-600 text-xs">{testimonial.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <p className="text-lg text-slate-600 mb-4">
            Ready to transform your email management?
          </p>
          <p className="text-sm text-slate-500">
            Join these professionals and thousands more who trust Inbox Advisor
          </p>
        </div>
      </div>
    </div>
  );
}