import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, BarChart3, CheckCircle, Clock, Shield, Zap } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";
const LandingPage = () => {
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <div className="flex items-center space-x-2">
            <Mail className="h-8 w-8 text-primary-light" />
            <span className="text-2xl font-bold gradient-primary bg-clip-text text-transparent">
              EmAil Insight Helper
            </span>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="ghost">Features</Button>
            <Button variant="ghost">Pricing</Button>
            <Button variant="outline">Sign In</Button>
            <Button className="gradient-primary text-white border-0">Get Started</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden" style={{
      backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${heroBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white">
                Transform Your Email Into
                <span className="gradient-primary bg-clip-text block text-yellow-300">
                  Actionable Insights
                </span>
              </h1>
              <p className="text-xl text-white/90 max-w-3xl mx-auto">
                Connect your Gmail account and let AI analyze your conversations to uncover patterns, 
                track action items, and boost your productivity like never before.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="gradient-primary text-white border-0 shadow-primary text-center bg-amber-300 hover:bg-amber-200">
                <Mail className="mr-2 h-5 w-5" />
                Connect Gmail & Start Free
              </Button>
              <Button size="lg" variant="outline" className="shadow-card bg-white/10 text-white border-white/20 hover:bg-white/20">
                Watch Demo
              </Button>
            </div>
            
            <div className="text-sm text-white/80">
              🔒 Secure OAuth connection • ✨ 10 conversations free • 🚀 No credit card required
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Why Choose EmAil Insight Helper?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform the way you manage and understand your email communications
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <BarChart3 className="h-12 w-12 text-primary-light mb-4" />
                <CardTitle>Smart Analytics</CardTitle>
                <CardDescription>
                  Track conversation trends, response rates, and optimal sending times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Response time analysis</li>
                  <li>• Conversation categorization</li>
                  <li>• Topic trend tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-primary-light mb-4" />
                <CardTitle>Action Items</CardTitle>
                <CardDescription>
                  AI-powered action item detection and personal task management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• AI-suggested actions</li>
                  <li>• Custom task creation</li>
                  <li>• Priority tracking</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <Shield className="h-12 w-12 text-primary-light mb-4" />
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Bank-level security with OAuth authentication and data encryption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• OAuth 2.0 authentication</li>
                  <li>• End-to-end encryption</li>
                  <li>• No data retention policy</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <Zap className="h-12 w-12 text-primary-light mb-4" />
                <CardTitle>Lightning Fast</CardTitle>
                <CardDescription>
                  Get insights in seconds with our optimized AI processing pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Real-time analysis</li>
                  <li>• Instant dashboard updates</li>
                  <li>• Quick conversation search</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <Clock className="h-12 w-12 text-primary-light mb-4" />
                <CardTitle>Time-Saving</CardTitle>
                <CardDescription>
                  Reduce email management time by up to 70% with smart automation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Automated categorization</li>
                  <li>• Smart filtering</li>
                  <li>• Priority detection</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <Mail className="h-12 w-12 text-primary-light mb-4" />
                <CardTitle>Gmail Integration</CardTitle>
                <CardDescription>
                  Seamless integration with your Gmail account via secure APIs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• One-click connection</li>
                  <li>• Real-time sync</li>
                  <li>• No data migration needed</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start free and upgrade when you're ready for more insights
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="gradient-card shadow-card">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Free</CardTitle>
                <CardDescription>Perfect for getting started</CardDescription>
                <div className="text-4xl font-bold text-primary-light">$0</div>
                <div className="text-sm text-muted-foreground">Forever free</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>10 recent conversations analyzed</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Basic analytics dashboard</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>AI-suggested action items</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Secure Gmail connection</span>
                  </li>
                </ul>
                <Button className="w-full gradient-primary text-white border-0">
                  Get Started Free
                </Button>
              </CardContent>
            </Card>

            <Card className="gradient-card shadow-card border-primary-light border-2 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="gradient-primary px-4 py-1 rounded-full text-white text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>Full power of AI insights</CardDescription>
                <div className="text-4xl font-bold text-primary-light">$29</div>
                <div className="text-sm text-muted-foreground">per month</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Unlimited conversation analysis</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Advanced analytics & insights</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Custom action item management</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Topic-based conversation filtering</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Response time optimization</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-primary-light mr-3" />
                    <span>Priority customer support</span>
                  </li>
                </ul>
                <Button className="w-full gradient-primary text-white border-0 shadow-primary">
                  Upgrade to Pro
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 gradient-hero">
        <div className="container mx-auto px-4 text-center">
          <div className="space-y-8 text-white">
            <h2 className="text-3xl md:text-4xl font-bold">
              Ready to Transform Your Email Experience?
            </h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join thousands of professionals who are already using AI to make their email more productive
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-hover">
              <Mail className="mr-2 h-5 w-5" />
              Connect Gmail & Start Free
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-secondary/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-6 w-6 text-primary-light" />
                <span className="text-lg font-bold">EmAIl Insight Helper</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transform your email into actionable insights with AI-powered analysis.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Features</li>
                <li>Pricing</li>
                <li>API Documentation</li>
                <li>Integrations</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About</li>
                <li>Blog</li>
                <li>Careers</li>
                <li>Contact</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © 2024 EmAIl Insight Helper. All rights reserved.
          </div>
        </div>
      </footer>
    </div>;
};
export default LandingPage;