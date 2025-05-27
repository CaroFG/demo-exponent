"use client";

import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { MeiliSearch } from 'meilisearch'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

// Initialize MeiliSearch client
const searchClient = new MeiliSearch({
  host: process.env.NEXT_PUBLIC_MEILISEARCH_URL!,
  apiKey: process.env.NEXT_PUBLIC_MEILISEARCH_API_KEY
});

// Define the Professional type
interface Professional {
  _id: string;
  ProfessionalId: number;
  FirstName: string;
  LastName: string;
  MiddleName: string;
  PreferredName: string;
  SupervisorName: string;
  Suffix: string | null;
  Pronoun: string | null;
  BusinessPhone: string;
  MobilePhone: string;
  BusinessEmail: string;
  Title: string;
  ExpertiseName: string;
  Overview: string;
  OverviewReadMore: string;
  OfficeLocation: string;
  OfficeRegion: string;
  EducationRecords: Array<{
    ProfessionalId: number;
    School: string;
    Degree: string;
    YearOfDegree: number;
    Concentration: string;
    Honors: string | null;
    SortOrder: number;
    UniversityCity: string | null;
    CountryCode: string;
    StateCode: string | null;
  }>;
  Capabilities: Array<{
    ProfessionalId: number;
    CapabilityName: string;
    SortOrder: number;
  }>;
  StateLicenses: Array<{
    ProfessionalId: number;
    State: string;
    LicenseTitle: string;
    SortOrder: number;
  }>;
}

// Add these interfaces near the top with other interfaces
interface FacetDistribution {
  [key: string]: {
    [value: string]: number;
  };
}

interface FacetStats {
  [key: string]: {
    min: number;
    max: number;
  };
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmbedder, setSelectedEmbedder] = useState('default');
  const [semanticRatio, setSemanticRatio] = useState(1.0);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [selectedOfficeLocations, setSelectedOfficeLocations] = useState<string[]>([]);
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedLicenseTitles, setSelectedLicenseTitles] = useState<string[]>([]);
  const [facetDistribution, setFacetDistribution] = useState<FacetDistribution>({});
  const [facetStats, setFacetStats] = useState<FacetStats>({});
  const [allPossibleFacets, setAllPossibleFacets] = useState<FacetDistribution>({});
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);

  // Add a new effect to fetch all possible facets on component mount
  useEffect(() => {
    const fetchAllFacets = async () => {
      const results = await searchClient.index('professionals').search('', {
        facets: ['*'],
        limit: 0 // We only need facets, not results
      });
      setAllPossibleFacets(results.facetDistribution || {});
    };

    fetchAllFacets();
  }, []); // Run once on mount

  // Create a helper function to merge facet distributions
  const mergeFacetDistributions = (current: FacetDistribution, all: FacetDistribution) => {
    const merged: FacetDistribution = {};

    // Get all facet keys
    const facetKeys = new Set([
      ...Object.keys(current),
      ...Object.keys(all)
    ]);

    facetKeys.forEach(key => {
      merged[key] = {};
      
      // Get all possible values for this facet
      const allValues = new Set([
        ...Object.keys(current[key] || {}),
        ...Object.keys(all[key] || {})
      ]);

      // For each value, use current count if available, otherwise 0
      allValues.forEach(value => {
        merged[key][value] = current[key]?.[value] || 0;
      });
    });

    return merged;
  };

  // Handle search
  useEffect(() => {
    const searchProfessionals = async () => {
      const searchParams = {
        attributesToRetrieve: ['_id', 'FirstName', 'LastName', 'Suffix', 'Title', 'ExpertiseName', 'OfficeLocation', 'EducationRecords', 'Overview', 'OverviewReadMore', 'Capabilities', 'StateLicenses'],
        hybrid: {
          embedder: selectedEmbedder,
          semanticRatio: semanticRatio
        },
        facets: [
          'OfficeLocation',
          'ExpertiseName',
          'Capabilities.CapabilityName',
          'StateLicenses.State',
          'StateLicenses.LicenseTitle'
        ],
        filter: [
          ...(selectedOfficeLocations.length > 0 
            ? selectedOfficeLocations.map(loc => `OfficeLocation = "${loc}"`) 
            : []),
          ...(selectedExpertise.length > 0 
            ? selectedExpertise.map(exp => `ExpertiseName = "${exp}"`) 
            : []),
          ...(selectedCapabilities.length > 0 
            ? selectedCapabilities.map(cap => `Capabilities.CapabilityName = "${cap}"`) 
            : []),
          ...(selectedStates.length > 0 
            ? selectedStates.map(state => `StateLicenses.State = "${state}"`) 
            : []),
          ...(selectedLicenseTitles.length > 0 
            ? selectedLicenseTitles.map(license => `StateLicenses.LicenseTitle = "${license}"`) 
            : []),
        ]
      };

      const results = await searchClient.index('professionals').search(searchQuery, searchParams);
      setProfessionals(results.hits as Professional[]);
      
      // Merge current facets with all possible facets to show zero counts
      setFacetDistribution(
        mergeFacetDistributions(results.facetDistribution || {}, allPossibleFacets)
      );
      
      setFacetStats(results.facetStats || {});
    };

    searchProfessionals();
  }, [searchQuery, selectedOfficeLocations, selectedExpertise, selectedCapabilities, 
      selectedStates, selectedLicenseTitles, allPossibleFacets, selectedEmbedder, semanticRatio]);

  return (
    <div className="min-h-screen p-4">
      {/* Header with search input */}
      <header className="mb-8 max-w-5xl mx-auto">
        <div className="flex gap-4 items-center">
          <Input 
            type="search" 
            placeholder="Search professionals..." 
            className="flex-1"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Select
            value={selectedEmbedder}
            onValueChange={setSelectedEmbedder}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select embedder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="text-1">Text 1</SelectItem>
              <SelectItem value="text-2">Text 2</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 w-[200px]">
            <span className="text-sm text-muted-foreground">Semantic Ratio:</span>
            <Slider
              value={[semanticRatio]}
              onValueChange={([value]) => setSemanticRatio(value)}
              min={0}
              max={1}
              step={0.1}
              className="w-[100px]"
            />
            <span className="text-sm text-muted-foreground">{semanticRatio.toFixed(1)}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto grid grid-cols-[250px_1fr] gap-8">
        {/* Filters sidebar */}
        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <Accordion type="single" collapsible className="space-y-4">
                {/* Office Location Accordion Item */}
                <AccordionItem value="office-location">
                  <AccordionTrigger>Office Location</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['OfficeLocation'] && 
                        Object.entries(facetDistribution['OfficeLocation'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([location, count]) => (
                            <div key={location} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`location-${location}`}
                                checked={selectedOfficeLocations.includes(location)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedOfficeLocations([...selectedOfficeLocations, location]);
                                  } else {
                                    setSelectedOfficeLocations(selectedOfficeLocations.filter(l => l !== location));
                                  }
                                }}
                              />
                              <label htmlFor={`location-${location}`} className="flex-1">
                                {location}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Expertise Accordion Item */}
                <AccordionItem value="expertise">
                  <AccordionTrigger>Expertise</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['ExpertiseName'] && 
                        Object.entries(facetDistribution['ExpertiseName'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([expertise, count]) => (
                            <div key={expertise} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`expertise-${expertise}`}
                                checked={selectedExpertise.includes(expertise)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedExpertise([...selectedExpertise, expertise]);
                                  } else {
                                    setSelectedExpertise(selectedExpertise.filter(e => e !== expertise));
                                  }
                                }}
                              />
                              <label htmlFor={`expertise-${expertise}`} className="flex-1">
                                {expertise}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Capabilities Accordion Item */}
                <AccordionItem value="capabilities">
                  <AccordionTrigger>Capabilities</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['Capabilities.CapabilityName'] && 
                        Object.entries(facetDistribution['Capabilities.CapabilityName'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([capability, count]) => (
                            <div key={capability} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`capability-${capability}`}
                                checked={selectedCapabilities.includes(capability)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCapabilities([...selectedCapabilities, capability]);
                                  } else {
                                    setSelectedCapabilities(selectedCapabilities.filter(c => c !== capability));
                                  }
                                }}
                              />
                              <label htmlFor={`capability-${capability}`} className="flex-1">
                                {capability}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* State Licenses Accordion Item */}
                <AccordionItem value="state-licenses">
                  <AccordionTrigger>State Licenses</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['StateLicenses.State'] && 
                        Object.entries(facetDistribution['StateLicenses.State'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([state, count]) => (
                            <div key={state} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`state-${state}`}
                                checked={selectedStates.includes(state)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStates([...selectedStates, state]);
                                  } else {
                                    setSelectedStates(selectedStates.filter(s => s !== state));
                                  }
                                }}
                              />
                              <label htmlFor={`state-${state}`} className="flex-1">
                                {state}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* License Titles Accordion Item */}
                <AccordionItem value="license-titles">
                  <AccordionTrigger>License Titles</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      {facetDistribution['StateLicenses.LicenseTitle'] && 
                        Object.entries(facetDistribution['StateLicenses.LicenseTitle'])
                          .sort(([,a], [,b]) => b - a)
                          .map(([license, count]) => (
                            <div key={license} className="flex items-center space-x-2">
                              <Checkbox 
                                id={`license-${license}`}
                                checked={selectedLicenseTitles.includes(license)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedLicenseTitles([...selectedLicenseTitles, license]);
                                  } else {
                                    setSelectedLicenseTitles(selectedLicenseTitles.filter(l => l !== license));
                                  }
                                }}
                              />
                              <label htmlFor={`license-${license}`} className="flex-1">
                                {license}
                              </label>
                              <span className="text-sm text-muted-foreground">({count})</span>
                            </div>
                          ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </aside>

        {/* Search results */}
        <main>
          <div className="space-y-4">
            {professionals.map((professional) => (
              <Card 
                key={professional._id} 
                className="mb-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedProfessional(professional)}
              >
                <CardHeader>
                  <CardTitle>
                    {professional.FirstName} {professional.LastName}
                    {professional.Suffix && `, ${professional.Suffix}`}
                  </CardTitle>
                  <CardDescription>
                    {professional.Title}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{professional.ExpertiseName}, {professional.OfficeLocation}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Professional Details Dialog */}
          <Dialog open={!!selectedProfessional} onOpenChange={() => setSelectedProfessional(null)}>
            {selectedProfessional && (
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedProfessional.FirstName} {selectedProfessional.LastName}
                    {selectedProfessional.Suffix && `, ${selectedProfessional.Suffix}`}
                  </DialogTitle>
                  <div className="text-sm text-muted-foreground">
                    {selectedProfessional.Title}
                  </div>
                </DialogHeader>
                
                <ScrollArea className="h-full max-h-[calc(80vh-100px)]">
                  <div className="grid gap-4">
                    <div className="space-y-4">
                      <div>
                        <p className="mt-2">{selectedProfessional.ExpertiseName}, {selectedProfessional.OfficeLocation}</p>
                      </div>

                      {/* Education */}
                      {selectedProfessional.EducationRecords && selectedProfessional.EducationRecords.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Education</h3>
                          {selectedProfessional.EducationRecords.map((education, index) => (
                            <p key={index}>
                              {education.Degree} in {education.Concentration}, {education.School} ({education.YearOfDegree})
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Overview */}
                      {selectedProfessional.Overview && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Overview</h3>
                          <p>{selectedProfessional.Overview}</p>
                          {selectedProfessional.OverviewReadMore && (
                            <p>{selectedProfessional.OverviewReadMore}</p>
                          )}
                        </div>
                      )}

                      {/* Capabilities */}
                      {selectedProfessional.Capabilities && selectedProfessional.Capabilities.length > 0 && (
                        <div className="space-y-2">
                          <h3 className="font-semibold">Capabilities</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedProfessional.Capabilities.map((capability, index) => (
                              <span key={index} className="px-2 py-1 bg-secondary rounded-md text-sm">
                                {capability.CapabilityName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </DialogContent>
            )}
          </Dialog>
        </main>
      </div>
    </div>
  );
}
