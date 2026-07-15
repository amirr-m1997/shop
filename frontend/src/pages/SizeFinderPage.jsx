import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ruler, Check } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';

const SizeFinderPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState({
    gender: '',
    height: '',
    weight: '',
    fitPreference: '',
  });
  const [result, setResult] = useState(null);

  const handleAnswer = (question, value) => {
    setAnswers(prev => ({ ...prev, [question]: value }));
  };

  const calculateSize = () => {
    // Simple size calculation logic
    let size = 'M';
    const { gender, height, weight, fitPreference } = answers;
    
    if (gender === 'women') {
      if (weight < 50) size = 'XS';
      else if (weight < 60) size = 'S';
      else if (weight < 70) size = 'M';
      else if (weight < 80) size = 'L';
      else size = 'XL';
    } else {
      if (weight < 60) size = 'S';
      else if (weight < 75) size = 'M';
      else if (weight < 90) size = 'L';
      else if (weight < 105) size = 'XL';
      else size = 'XXL';
    }

    if (fitPreference === 'loose') {
      const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const currentIndex = sizes.indexOf(size);
      if (currentIndex < sizes.length - 1) {
        size = sizes[currentIndex + 1];
      }
    }

    setResult(size);
    setStep(3);
  };

  const resetQuiz = () => {
    setStep(1);
    setAnswers({ gender: '', height: '', weight: '', fitPreference: '' });
    setResult(null);
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="text-center mb-8">
        <Ruler className="h-16 w-16 mx-auto mb-4 text-primary" />
        <h1 className="text-3xl font-bold mb-2">Find Your Perfect Size</h1>
        <p className="text-muted-foreground">Answer a few questions to get personalized size recommendations</p>
      </div>

      <Card>
        <CardContent className="p-6">
          {/* Progress */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map(s => (
              <React.Fragment key={s}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  {step > s ? <Check className="h-5 w-5" /> : s}
                </div>
                {s < 3 && <div className={`w-16 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </React.Fragment>
            ))}
          </div>

          {/* Step 1: Gender */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">What's your gender?</h2>
              <div className="grid grid-cols-2 gap-4">
                {['men', 'women'].map(gender => (
                  <Button
                    key={gender}
                    variant={answers.gender === gender ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => handleAnswer('gender', gender)}
                    className="h-20 capitalize"
                  >
                    {gender}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full mt-6"
                onClick={() => setStep(2)}
                disabled={!answers.gender}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 2: Measurements */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-6">Your measurements</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Height (cm)</label>
                  <input
                    type="number"
                    value={answers.height}
                    onChange={e => handleAnswer('height', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="e.g., 175"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    value={answers.weight}
                    onChange={e => handleAnswer('weight', e.target.value)}
                    className="w-full p-3 border rounded-lg"
                    placeholder="e.g., 70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fit preference</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['tight', 'regular', 'loose'].map(pref => (
                      <Button
                        key={pref}
                        variant={answers.fitPreference === pref ? 'default' : 'outline'}
                        onClick={() => handleAnswer('fitPreference', pref)}
                        className="capitalize"
                      >
                        {pref}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={calculateSize}
                  disabled={!answers.height || !answers.weight || !answers.fitPreference}
                  className="flex-1"
                >
                  Get My Size
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Result */}
          {step === 3 && (
            <div className="text-center">
              <div className="bg-primary/10 rounded-full w-32 h-32 flex items-center justify-center mx-auto mb-6">
                <span className="text-5xl font-bold text-primary">{result}</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Your recommended size is {result}</h2>
              <p className="text-muted-foreground mb-6">
                Based on your measurements and fit preference
              </p>
              <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold mb-2">Your profile:</h3>
                <p>Gender: {answers.gender}</p>
                <p>Height: {answers.height} cm</p>
                <p>Weight: {answers.weight} kg</p>
                <p>Fit preference: {answers.fitPreference}</p>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={resetQuiz} className="flex-1">
                  Retake Quiz
                </Button>
                <Button onClick={() => navigate('/products')} className="flex-1">
                  Shop {result} Size
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SizeFinderPage;
