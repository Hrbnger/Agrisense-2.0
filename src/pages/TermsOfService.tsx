import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/settings")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Settings
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent className="space-y-6 prose prose-slate dark:prose-invert max-w-none">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using AgriSense ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                AgriSense is an agricultural technology platform that provides:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Plant identification services using image recognition technology</li>
                <li>Disease diagnosis and treatment recommendations for plants</li>
                <li>Weather forecasting and agricultural weather data</li>
                <li>Community forum for farmers and agricultural enthusiasts</li>
                <li>User profile management and data storage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To use certain features of the Service, you must register for an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Provide accurate, current, and complete information during registration</li>
                <li>Maintain and update your account information to keep it accurate</li>
                <li>Maintain the security of your password and identification</li>
                <li>Accept all responsibility for activities that occur under your account</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the rights of others</li>
                <li>Upload or transmit any malicious code, viruses, or harmful data</li>
                <li>Spam, harass, or abuse other users</li>
                <li>Impersonate any person or entity</li>
                <li>Interfere with or disrupt the Service or servers</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Use automated systems to access the Service without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Content and Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                All content on the Service, including but not limited to text, graphics, logos, images, and software, is the property of AgriSense or its content suppliers and is protected by copyright and other intellectual property laws.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You retain ownership of any content you submit, post, or display on the Service. By submitting content, you grant AgriSense a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and distribute your content for the purpose of operating and improving the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Disclaimers and Limitations</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>Medical and Agricultural Advice:</strong> The plant identification, disease diagnosis, and treatment recommendations provided by AgriSense are for informational purposes only and should not be considered as professional agricultural, medical, or legal advice. Always consult with qualified professionals before making decisions based on information from the Service.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>Accuracy:</strong> While we strive to provide accurate information, we do not guarantee the accuracy, completeness, or usefulness of any information on the Service. The Service is provided "as is" without warranties of any kind.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, AgriSense shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Weather Data</h2>
              <p className="text-muted-foreground leading-relaxed">
                Weather information provided by the Service is sourced from third-party providers. We do not guarantee the accuracy, timeliness, or completeness of weather data. Weather forecasts are estimates and should not be solely relied upon for critical agricultural decisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Community Forum</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                The community forum is a space for users to share knowledge and experiences. You are responsible for the content you post. We reserve the right to remove any content that violates these terms or is otherwise objectionable.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Forum content reflects the views of individual users and does not necessarily represent the views of AgriSense.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account and access to the Service immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page and updating the "Last updated" date. Your continued use of the Service after such modifications constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">12. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us through the Service or via the contact information provided in your account settings.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;

